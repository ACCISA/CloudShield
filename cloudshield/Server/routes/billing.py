import os
import stripe
from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId

# Database imports using your specific project structure
try:
    from utils.database import organizations, org_filter
except ImportError:
    from ..utils.database import organizations, org_filter

billing_bp = Blueprint('billing', __name__)

# Stripe Configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
UI_BASE_URL = os.getenv("UI_BASE_URL", "http://localhost:5173")

# Map Stripe Price IDs to internal package names
PRICE_TO_PACKAGE = {
    "price_1T3VRDA5QKTufQ3csurJvjpn": "enterprise", # $89
    "price_1T3VQrA5QKTufQ3cRB80WIPb": "pro",        # $59
    "price_1T3VQLA5QKTufQ3cLmrB5VTV": "basic"       # $29
}

# Resource limits for each tier
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

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url=f"{UI_BASE_URL}/dashboard?status=success",
            cancel_url=f"{UI_BASE_URL}/subscription",
            metadata={
                "org_id": org_id,
                "package_type": PRICE_TO_PACKAGE.get(price_id, "basic")
            }
        )
        return jsonify({"url": session.url})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@billing_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('STRIPE_SIGNATURE')
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # CASE: Initial Purchase
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        update_org_subscription(
            session['metadata'].get('org_id'), 
            session['metadata'].get('package_type'), 
            session.get('customer')
        )

    # CASE: Upgrade/Downgrade via Customer Portal
    elif event['type'] == 'customer.subscription.updated':
        sub = event['data']['object']
        new_price_id = sub['items']['data'][0]['price']['id']
        pkg = PRICE_TO_PACKAGE.get(new_price_id, "basic")
        
        organizations.update_one(
            {"stripe_customer_id": sub['customer']},
            {"$set": {
                "package": pkg, 
                "workstation_limit": PACKAGE_LIMITS[pkg]['workstations']
            }}
        )

    # CASE: Cancellation
    elif event['type'] == 'customer.subscription.deleted':
        sub = event['data']['object']
        organizations.update_one(
            {"stripe_customer_id": sub['customer']},
            {"$set": {
                "package": "basic", 
                "workstation_limit": 5, 
                "subscription_status": "canceled"
            }}
        )

    return jsonify({"status": "success"}), 200

@billing_bp.route('/create-portal-session', methods=['POST'])
def create_portal_session():
    try:
        org = organizations.find_one(org_filter(request.json.get("org_id")))
        if not org or not org.get("stripe_customer_id"):
            return jsonify({"error": "No Stripe customer linked"}), 400

        session = stripe.billing_portal.Session.create(
            customer=org.get("stripe_customer_id"),
            return_url=f"{UI_BASE_URL}/subscription",
        )
        return jsonify({"url": session.url})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@billing_bp.route('/dev-upgrade', methods=['POST'])
def dev_upgrade():
    data = request.json
    update_org_subscription(data.get("org_id"), data.get("package"), "cus_DEV_BYPASS")
    return jsonify({"message": "Local bypass success"})

def update_org_subscription(org_id, package, stripe_cust_id):
    limits = PACKAGE_LIMITS.get(package, PACKAGE_LIMITS['basic'])
    organizations.update_one(
        org_filter(org_id),
        {"$set": {
            "package": package,
            "stripe_customer_id": stripe_cust_id,
            "subscription_status": "active",
            "workstation_limit": limits['workstations']
        }}
    )
    print(f"[billing.py] Updated Org {org_id} to {package}")