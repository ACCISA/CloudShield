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

def is_subscription_canceling(sub):
    """
    Returns True if a subscription is scheduled to cancel or already canceled.

    Stripe has two cancellation mechanisms depending on billing mode:
    - Legacy billing:  cancel_at_period_end = True  (cancel_at may or may not be set)
    - Flexible billing (2026+ API): cancel_at_period_end stays False, but cancel_at
      is set to the period-end timestamp. We must check BOTH fields.
    """
    cancel_at_period_end = sub.get('cancel_at_period_end', False) if isinstance(sub, dict) else sub.cancel_at_period_end
    cancel_at = sub.get('cancel_at') if isinstance(sub, dict) else sub.cancel_at
    status = sub.get('status') if isinstance(sub, dict) else sub.status
    return bool(cancel_at_period_end or cancel_at or status == 'canceled')

@billing_bp.route('/create-checkout', methods=['POST'])
def create_checkout():
    try:
        data = request.json
        price_id = data.get("price_id")
        org_id = data.get("org_id")
        if not price_id or not org_id:
            return jsonify({"error": "Missing price_id or org_id"}), 400

        # Allow callers to override where Stripe redirects after success/cancel.
        # Signup flow passes success_path="/provisioning", cancel_path="/signup".
        # BillingTab (plan upgrade) passes nothing, so defaults keep existing behaviour.
        success_path = data.get("success_path", "/settings?status=success")
        cancel_path = data.get("cancel_path", "/settings")

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url=f"{UI_BASE_URL}{success_path}",
            cancel_url=f"{UI_BASE_URL}{cancel_path}",
            metadata={"org_id": org_id, "package_type": PRICE_TO_PACKAGE.get(price_id, "basic")}
        )
        return jsonify({"url": session.url})
    except Exception as e:
        logger.error(f"Stripe Checkout Error: {e}")
        return jsonify({"error": str(e)}), 400

@billing_bp.route('/payment-method/<org_id>', methods=['GET'])
def get_payment_method(org_id):
    try:
        org = organizations.find_one(org_filter(org_id))
        live_package = org.get("package", "basic") if org else "basic"
        db_sub_status = org.get("subscription_status", "active") if org else "active"
        cancel_at = org.get("cancel_at_date")

        if not org or not org.get("stripe_customer_id"):
            return jsonify({
                "message": "No linked payment method",
                "package": live_package,
                "sub_status": db_sub_status,
                "cancel_at_date": cancel_at
            }), 200

        cust_id = org["stripe_customer_id"]
        customer = stripe.Customer.retrieve(cust_id)

        # === LIVE SYNC: Always fetch source of truth from Stripe ===
        logger.warning(f"=== LIVE SYNC: Fetching subscription for customer {cust_id} ===")

        live_sub = None

        # Fetch active subscriptions first.
        # NOTE: In Stripe flexible billing mode (API 2026+), subscriptions scheduled to
        # cancel at period end keep status='active' and cancel_at_period_end=False.
        # The cancellation is only indicated by a populated cancel_at timestamp.
        active_subs = stripe.Subscription.list(
            customer=cust_id,
            status='active',
            limit=1
        )

        if active_subs.data:
            live_sub = active_subs.data[0]
        else:
            canceled_subs = stripe.Subscription.list(
                customer=cust_id,
                status='canceled',
                limit=1
            )
            if canceled_subs.data:
                live_sub = canceled_subs.data[0]

        if live_sub:
            cancel_at_ts = live_sub.cancel_at
            cancel_at = datetime.fromtimestamp(cancel_at_ts).isoformat() if cancel_at_ts else None

            # is_subscription_canceling checks cancel_at_period_end OR cancel_at OR status=canceled.
            # This covers both legacy and flexible billing modes.
            db_sub_status = "canceled" if is_subscription_canceling(live_sub) else "active"

            logger.warning(
                f"LIVE SYNC RESULT -> Sub: {live_sub.id} | "
                f"stripe_status: {live_sub.status} | "
                f"cancel_at_period_end: {live_sub.cancel_at_period_end} | "
                f"cancel_at: {cancel_at} | "
                f"-> db_sub_status: {db_sub_status}"
            )

            organizations.update_one(
                {"stripe_customer_id": cust_id},
                {"$set": {
                    "subscription_status": db_sub_status,
                    "cancel_at_date": cancel_at
                }}
            )
        else:
            logger.warning(f"LIVE SYNC: No subscription found for customer {cust_id}")
        # ============================================================

        default_method_id = customer.get("invoice_settings", {}).get("default_payment_method")
        if not default_method_id:
            methods = stripe.PaymentMethod.list(customer=cust_id, type="card")
            if not methods.data:
                return jsonify({
                    "message": "No card on file",
                    "package": live_package,
                    "sub_status": db_sub_status,
                    "cancel_at_date": cancel_at
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
            "sub_status": db_sub_status,
            "cancel_at_date": cancel_at
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
        return jsonify([{
            "id": inv.id, "plan": inv.lines.data[0].description if inv.lines.data else "Plan",
            "amount": f"${inv.amount_paid / 100:.2f} {inv.currency.upper()}",
            "date": datetime.fromtimestamp(inv.created).strftime('%m/%d/%Y %I:%M %p'),
            "status": inv.status.capitalize(), "url": inv.invoice_pdf
        } for inv in invoices.data]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@billing_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('STRIPE_SIGNATURE')
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception:
        return jsonify({"error": "Invalid Webhook Signature"}), 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        update_org_subscription(session['metadata'].get('org_id'), session['metadata'].get('package_type'), session.get('customer'), "active")

    elif event['type'] == 'customer.subscription.updated':
        sub = event['data']['object']
        cust_id = sub['customer']

        cancel_at_ts = sub.get('cancel_at')
        cancel_date_iso = datetime.fromtimestamp(cancel_at_ts).isoformat() if cancel_at_ts else None

        # Use shared helper — catches both legacy (cancel_at_period_end) and
        # flexible billing mode (cancel_at timestamp) cancellations.
        final_db_status = "canceled" if is_subscription_canceling(sub) else "active"

        new_price_id = sub['items']['data'][0]['price']['id']
        pkg = PRICE_TO_PACKAGE.get(new_price_id, "basic")
        limits = PACKAGE_LIMITS.get(pkg, PACKAGE_LIMITS['basic'])

        logger.warning(
            f"WEBHOOK customer.subscription.updated -> "
            f"sub: {sub.get('id')} | status: {sub.get('status')} | "
            f"cancel_at_period_end: {sub.get('cancel_at_period_end')} | "
            f"cancel_at: {cancel_date_iso} | -> db_status: {final_db_status}"
        )

        organizations.update_one(
            {"stripe_customer_id": cust_id},
            {"$set": {
                "package": pkg,
                "subscription_status": final_db_status,
                "cancel_at_date": cancel_date_iso,
                "workstation_limit": limits['workstations']
            }}
        )

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

    return jsonify({"status": "success"}), 200

@billing_bp.route('/create-portal-session', methods=['POST'])
def create_portal_session():
    try:
        data = request.json
        org = organizations.find_one(org_filter(data.get("org_id")))
        session = stripe.billing_portal.Session.create(
            customer=org.get("stripe_customer_id"),
            return_url=f"{UI_BASE_URL}/settings?status=success",
        )
        return jsonify({"url": session.url})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def update_org_subscription(org_id, package, stripe_cust_id, status):
    limits = PACKAGE_LIMITS.get(package, PACKAGE_LIMITS['basic'])
    organizations.update_one(
        org_filter(org_id),
        {"$set": {
            "package": package, "stripe_customer_id": stripe_cust_id,
            "subscription_status": status, "cancel_at_date": None,
            "workstation_limit": limits['workstations']
        }}
    )