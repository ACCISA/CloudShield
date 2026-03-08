import os
import stripe
import logging
from flask import Blueprint, request, jsonify
from datetime import datetime

# Handle both local and docker import structures
try:
    from utils.database import organizations, org_filter
except ImportError:
    from ..utils.database import organizations, org_filter

billing_bp = Blueprint('billing', __name__)
logger = logging.getLogger("cloudshield.billing")

# --- Configuration ---
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
UI_BASE_URL = os.getenv("UI_BASE_URL", "http://localhost:5173")

PRICE_TO_PACKAGE = {
    "price_1T3VRDA5QKTufQ3csurJvjpn": "enterprise", 
    "price_1T3VQrA5QKTufQ3cRB80WIPb": "pro",        
    "price_1T3VQLA5QKTufQ3cLmrB5VTV": "basic"       
}

PACKAGE_LIMITS = {
    "basic": {"workstations": 5, "users": 10},
    "pro": {"workstations": 20, "users": 50},
    "enterprise": {"workstations": 100, "users": 500}
}

@billing_bp.route('/create-checkout', methods=['POST'])
def create_checkout():
    try:
        data = request.json
        price_id = data.get("price_id")
        org_id = data.get("org_id")

        if not price_id or not org_id:
            return jsonify({"error": "Missing price_id or org_id"}), 400

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url=f"{UI_BASE_URL}/settings?status=success",
            cancel_url=f"{UI_BASE_URL}/settings",
            metadata={
                "org_id": org_id,
                "package_type": PRICE_TO_PACKAGE.get(price_id, "basic")
            }
        )
        return jsonify({"url": session.url})
    except Exception as e:
        logger.error(f"Stripe Checkout Error: {e}")
        return jsonify({"error": str(e)}), 400

@billing_bp.route('/payment-method/<org_id>', methods=['GET'])
def get_payment_method(org_id):
    try:
        org = organizations.find_one(org_filter(org_id))
        
        # Default values if org not found
        live_package = org.get("package", "basic") if org else "basic"
        sub_status = org.get("subscription_status", "active") if org else "active"
        cancel_at = org.get("cancel_at_date") # <--- ADDED EXTRACT DATE

        if not org or not org.get("stripe_customer_id"):
            return jsonify({
                "message": "No linked payment method", 
                "package": live_package, 
                "sub_status": sub_status,
                "cancel_at_date": cancel_at # <--- ADDED TO PAYLOAD
            }), 200

        customer = stripe.Customer.retrieve(org["stripe_customer_id"])
        default_method_id = customer.get("invoice_settings", {}).get("default_payment_method")

        if not default_method_id:
            methods = stripe.PaymentMethod.list(customer=org["stripe_customer_id"], type="card")
            if not methods.data:
                return jsonify({
                    "message": "No card on file", 
                    "package": live_package, 
                    "sub_status": sub_status,
                    "cancel_at_date": cancel_at # <--- ADDED TO PAYLOAD
                }), 200
            method = methods.data[0]
        else:
            method = stripe.PaymentMethod.retrieve(default_method_id)
        
        return jsonify({
            "brand": method.card.brand,
            "last4": method.card.last4,
            "exp_month": method.card.exp_month,
            "exp_year": method.card.exp_year,
            "package": live_package,
            "sub_status": sub_status,
            "cancel_at_date": cancel_at # <--- ADDED TO PAYLOAD
        }), 200
    except Exception as e:
        logger.error(f"Error fetching payment method: {e}")
        return jsonify({"error": str(e)}), 500

@billing_bp.route('/invoices/<org_id>', methods=['GET'])
def get_invoices(org_id):
    try:
        org = organizations.find_one(org_filter(org_id))
        if not org or not org.get("stripe_customer_id"):
            return jsonify([]), 200

        invoices = stripe.Invoice.list(customer=org["stripe_customer_id"], limit=100)

        formatted_invoices = []
        for inv in invoices.data:
            formatted_invoices.append({
                "id": inv.id,
                "plan": inv.lines.data[0].description if (inv.lines and inv.lines.data) else "CloudShield Plan",
                "amount": f"${inv.amount_paid / 100:.2f} {inv.currency.upper()}",
                "date": datetime.fromtimestamp(inv.created).strftime('%m/%d/%Y %I:%M %p'),
                "status": inv.status.capitalize(),
                "url": inv.invoice_pdf 
            })

        return jsonify(formatted_invoices), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@billing_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        logger.error(f"Webhook Signature Error: {e}")
        return jsonify({"error": "Invalid Webhook Signature"}), 400

    # --- Case 1: Initial Purchase ---
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        org_id = session['metadata'].get('org_id')
        pkg = session['metadata'].get('package_type')
        cust_id = session.get('customer')
        
        update_org_subscription(org_id, pkg, cust_id, "active")
        logger.warning(f"WEBHOOK SUCCESS: New Sub Created for Org {org_id}")
    
    # --- Case 2: Cancellation or Plan Change ---
    elif event['type'] == 'customer.subscription.updated':
        sub = event['data']['object']
        cust_id = sub['customer']
        
        # Detection logic for "Scheduled for Cancellation"
        is_canceling = sub.get('cancel_at_period_end', False)
        status_string = sub.get('status') # 'active', 'past_due', 'canceled'
        cancel_at_ts = sub.get('cancel_at') # <--- ADDED STRIPE TIMESTAMP
        
        final_db_status = "canceled" if (is_canceling or status_string == 'canceled') else "active"
        
        # Convert timestamp to a string format we can send to frontend
        cancel_date_iso = datetime.fromtimestamp(cancel_at_ts).isoformat() if cancel_at_ts else None # <--- ADDED
        
        # Get the current package based on the price ID
        new_price_id = sub['items']['data'][0]['price']['id']
        pkg = PRICE_TO_PACKAGE.get(new_price_id, "basic")
        limits = PACKAGE_LIMITS.get(pkg, PACKAGE_LIMITS['basic'])

        # Aggressive Logging
        logger.warning(f"--- STRIPE WEBHOOK RECEIVED ---")
        logger.warning(f"Customer: {cust_id}")
        logger.warning(f"Status: {status_string} | CancelAtPeriodEnd: {is_canceling}")
        
        result = organizations.update_one(
            {"stripe_customer_id": cust_id},
            {"$set": {
                "package": pkg, 
                "subscription_status": final_db_status, 
                "cancel_at_date": cancel_date_iso, # <--- ADDED TO MONGODB
                "workstation_limit": limits['workstations']
            }}
        )
        
        logger.warning(f"DATABASE UPDATE: Found {result.matched_count}, Updated {result.modified_count}. DB set to {final_db_status}")

    # --- Case 3: Subscription Ends Immediately ---
    elif event['type'] == 'customer.subscription.deleted':
        sub = event['data']['object']
        organizations.update_one(
            {"stripe_customer_id": sub['customer']},
            {"$set": {
                "package": "basic", 
                "subscription_status": "canceled", 
                "workstation_limit": PACKAGE_LIMITS['basic']['workstations']
            }}
        )
        logger.warning(f"WEBHOOK SUCCESS: Subscription Deleted for {sub['customer']}")
        
    return jsonify({"status": "success"}), 200

@billing_bp.route('/create-portal-session', methods=['POST'])
def create_portal_session():
    try:
        data = request.json
        org = organizations.find_one(org_filter(data.get("org_id")))
        if not org or not org.get("stripe_customer_id"):
            return jsonify({"error": "No Stripe customer linked"}), 400

        session = stripe.billing_portal.Session.create(
            customer=org.get("stripe_customer_id"),
            return_url=f"{UI_BASE_URL}/settings?status=success",
        )
        return jsonify({"url": session.url})
    except Exception as e:
        logger.error(f"Portal Session Error: {e}")
        return jsonify({"error": str(e)}), 400

def update_org_subscription(org_id, package, stripe_cust_id, status):
    limits = PACKAGE_LIMITS.get(package, PACKAGE_LIMITS['basic'])
    result = organizations.update_one(
        org_filter(org_id),
        {"$set": {
            "package": package,
            "stripe_customer_id": stripe_cust_id,
            "subscription_status": status,
            "cancel_at_date": None, # <--- RESET DATE ON NEW SUB
            "workstation_limit": limits['workstations']
        }}
    )
    return result