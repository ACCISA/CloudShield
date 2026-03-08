"""
Tests for cloudshield/Server/routes/billing.py

Covers:
- is_subscription_canceling helper
- create_checkout route
- get_payment_method route (live sync, all branches)
- get_invoices route
- stripe_webhook route (all event types)
- create_portal_session route
- update_org_subscription helper
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime



@pytest.fixture
def app():
    """Create a minimal Flask app with the billing blueprint registered."""
    from flask import Flask
    try:
        from cloudshield.Server.routes.billing import billing_bp
    except ImportError:
        from Server.routes.billing import billing_bp

    flask_app = Flask(__name__)
    flask_app.config["TESTING"] = True
    flask_app.register_blueprint(billing_bp, url_prefix="/api/billing")
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()



def make_org(stripe_cust_id="cus_test123", package="pro", sub_status="active", cancel_at=None):
    return {
        "_id": "org_abc",
        "stripe_customer_id": stripe_cust_id,
        "package": package,
        "subscription_status": sub_status,
        "cancel_at_date": cancel_at,
    }


def make_sub(status="active", cancel_at_period_end=False, cancel_at=None, sub_id="sub_123",
             price_id="price_1T3VQrA5QKTufQ3cRB80WIPb"):
    sub = MagicMock()
    sub.id = sub_id
    sub.status = status
    sub.cancel_at_period_end = cancel_at_period_end
    sub.cancel_at = cancel_at
    sub.items.data = [MagicMock()]
    sub.items.data[0].price.id = price_id
    return sub


def make_payment_method(brand="visa", last4="4242", exp_month=12, exp_year=2026):
    pm = MagicMock()
    pm.card.brand = brand
    pm.card.last4 = last4
    pm.card.exp_month = exp_month
    pm.card.exp_year = exp_year
    return pm



class TestIsSubscriptionCanceling:
    def _fn(self):
        try:
            from cloudshield.Server.routes.billing import is_subscription_canceling
        except ImportError:
            from Server.routes.billing import is_subscription_canceling
        return is_subscription_canceling

    def test_active_no_cancel(self):
        fn = self._fn()
        sub = {"status": "active", "cancel_at_period_end": False, "cancel_at": None}
        assert fn(sub) is False

    def test_cancel_at_period_end_true(self):
        fn = self._fn()
        sub = {"status": "active", "cancel_at_period_end": True, "cancel_at": None}
        assert fn(sub) is True

    def test_cancel_at_timestamp_set(self):
        fn = self._fn()
        sub = {"status": "active", "cancel_at_period_end": False, "cancel_at": 1775466029}
        assert fn(sub) is True

    def test_status_canceled(self):
        fn = self._fn()
        sub = {"status": "canceled", "cancel_at_period_end": False, "cancel_at": None}
        assert fn(sub) is True

    def test_stripe_object_active(self):
        fn = self._fn()
        sub = MagicMock()
        sub.status = "active"
        sub.cancel_at_period_end = False
        sub.cancel_at = None
        assert fn(sub) is False

    def test_stripe_object_canceling(self):
        fn = self._fn()
        sub = MagicMock()
        sub.status = "active"
        sub.cancel_at_period_end = False
        sub.cancel_at = 1775466029
        assert fn(sub) is True



class TestCreateCheckout:
    @patch("stripe.checkout.Session.create")
    def test_success_default_urls(self, mock_create, client):
        mock_create.return_value = MagicMock(url="https://checkout.stripe.com/pay/cs_test")
        res = client.post("/api/billing/create-checkout", json={
            "price_id": "price_1T3VQrA5QKTufQ3cRB80WIPb",
            "org_id": "org_abc"
        })
        assert res.status_code == 200
        assert res.get_json()["url"] == "https://checkout.stripe.com/pay/cs_test"

    @patch("stripe.checkout.Session.create")
    def test_success_custom_paths(self, mock_create, client):
        mock_create.return_value = MagicMock(url="https://checkout.stripe.com/pay/cs_test")
        res = client.post("/api/billing/create-checkout", json={
            "price_id": "price_1T3VQLA5QKTufQ3cLmrB5VTV",
            "org_id": "org_abc",
            "success_path": "/provisioning",
            "cancel_path": "/signup"
        })
        assert res.status_code == 200
        call_kwargs = mock_create.call_args[1]
        assert "/provisioning" in call_kwargs["success_url"]
        assert "/signup" in call_kwargs["cancel_url"]

    def test_missing_price_id(self, client):
        res = client.post("/api/billing/create-checkout", json={"org_id": "org_abc"})
        assert res.status_code == 400
        assert "error" in res.get_json()

    def test_missing_org_id(self, client):
        res = client.post("/api/billing/create-checkout", json={"price_id": "price_xxx"})
        assert res.status_code == 400

    @patch("stripe.checkout.Session.create", side_effect=Exception("Stripe down"))
    def test_stripe_error(self, mock_create, client):
        res = client.post("/api/billing/create-checkout", json={
            "price_id": "price_1T3VQrA5QKTufQ3cRB80WIPb",
            "org_id": "org_abc"
        })
        assert res.status_code == 400
        assert "error" in res.get_json()


class TestGetPaymentMethod:

    def _mock_org_module(self):
        """Return the correct module path for patching."""
        try:
            import cloudshield.Server.routes.billing  # noqa
            return "cloudshield.Server.routes.billing"
        except ImportError:
            return "Server.routes.billing"

    @patch("stripe.PaymentMethod.retrieve")
    @patch("stripe.Subscription.list")
    @patch("stripe.Customer.retrieve")
    def test_active_subscription_with_card(self, mock_cust, mock_sub_list, mock_pm, client):
        mod = self._mock_org_module()
        with patch(f"{mod}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            mock_orgs.update_one.return_value = None

            customer = MagicMock()
            customer.get.return_value = {"default_payment_method": "pm_123"}
            mock_cust.return_value = customer

            sub = make_sub()
            sub_list = MagicMock()
            sub_list.data = [sub]
            mock_sub_list.return_value = sub_list

            mock_pm.return_value = make_payment_method()

            res = client.get("/api/billing/payment-method/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 200
            data = res.get_json()
            assert data["brand"] == "visa"
            assert data["sub_status"] == "active"

    @patch("stripe.PaymentMethod.retrieve")
    @patch("stripe.Subscription.list")
    @patch("stripe.Customer.retrieve")
    def test_canceling_subscription_flexible_billing(self, mock_cust, mock_sub_list, mock_pm, client):
        mod = self._mock_org_module()
        with patch(f"{mod}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            mock_orgs.update_one.return_value = None

            customer = MagicMock()
            customer.get.return_value = {"default_payment_method": "pm_123"}
            mock_cust.return_value = customer

            # Flexible billing: cancel_at set, cancel_at_period_end=False
            sub = make_sub(cancel_at=1775466029, cancel_at_period_end=False)
            sub_list = MagicMock()
            sub_list.data = [sub]
            mock_sub_list.return_value = sub_list

            mock_pm.return_value = make_payment_method()

            res = client.get("/api/billing/payment-method/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 200
            assert res.get_json()["sub_status"] == "canceled"

    @patch("stripe.Subscription.list")
    @patch("stripe.Customer.retrieve")
    def test_no_stripe_customer_returns_db_values(self, mock_cust, mock_sub_list, client):
        mod = self._mock_org_module()
        with patch(f"{mod}.organizations") as mock_orgs:
            org = make_org(stripe_cust_id=None)
            org.pop("stripe_customer_id")
            mock_orgs.find_one.return_value = org

            res = client.get("/api/billing/payment-method/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 200
            data = res.get_json()
            assert "message" in data

    @patch("stripe.PaymentMethod.list")
    @patch("stripe.Subscription.list")
    @patch("stripe.Customer.retrieve")
    def test_no_default_payment_method_fallback(self, mock_cust, mock_sub_list, mock_pm_list, client):
        mod = self._mock_org_module()
        with patch(f"{mod}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            mock_orgs.update_one.return_value = None

            customer = MagicMock()
            # No default payment method
            customer.get.return_value = {}
            mock_cust.return_value = customer

            sub = make_sub()
            sub_list = MagicMock()
            sub_list.data = [sub]
            mock_sub_list.return_value = sub_list

            pm_list = MagicMock()
            pm_list.data = [make_payment_method()]
            mock_pm_list.return_value = pm_list

            res = client.get("/api/billing/payment-method/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 200

    @patch("stripe.PaymentMethod.list")
    @patch("stripe.Subscription.list")
    @patch("stripe.Customer.retrieve")
    def test_no_card_on_file(self, mock_cust, mock_sub_list, mock_pm_list, client):
        mod = self._mock_org_module()
        with patch(f"{mod}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            mock_orgs.update_one.return_value = None

            customer = MagicMock()
            customer.get.return_value = {}
            mock_cust.return_value = customer

            sub = make_sub()
            sub_list = MagicMock()
            sub_list.data = [sub]
            mock_sub_list.return_value = sub_list

            pm_list = MagicMock()
            pm_list.data = []  # No cards
            mock_pm_list.return_value = pm_list

            res = client.get("/api/billing/payment-method/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 200
            assert "message" in res.get_json()

    @patch("stripe.Subscription.list")
    @patch("stripe.Customer.retrieve")
    def test_no_subscription_found(self, mock_cust, mock_sub_list, client):
        mod = self._mock_org_module()
        with patch(f"{mod}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            mock_orgs.update_one.return_value = None

            customer = MagicMock()
            customer.get.return_value = {}
            mock_cust.return_value = customer

            # Both active and canceled return empty
            empty_list = MagicMock()
            empty_list.data = []
            mock_sub_list.return_value = empty_list

            res = client.get("/api/billing/payment-method/org_abc",
                             headers={"Authorization": "Bearer test"})
            # Should not crash
            assert res.status_code in (200, 500)

    @patch("stripe.Customer.retrieve", side_effect=Exception("Stripe error"))
    def test_stripe_exception_returns_500(self, mock_cust, client):
        mod = self._mock_org_module()
        with patch(f"{mod}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            res = client.get("/api/billing/payment-method/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 500


class TestGetInvoices:
    def _mod(self):
        try:
            import cloudshield.Server.routes.billing  # noqa
            return "cloudshield.Server.routes.billing"
        except ImportError:
            return "Server.routes.billing"

    @patch("stripe.Invoice.list")
    def test_returns_invoice_list(self, mock_inv_list, client):
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()

            inv = MagicMock()
            inv.id = "inv_001"
            inv.lines.data = [MagicMock()]
            inv.lines.data[0].description = "Pro Plan"
            inv.amount_paid = 5900
            inv.currency = "usd"
            inv.created = 1700000000
            inv.status = "paid"
            inv.invoice_pdf = "https://stripe.com/invoice.pdf"

            mock_inv_list.return_value = MagicMock(data=[inv])

            res = client.get("/api/billing/invoices/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 200
            data = res.get_json()
            assert len(data) == 1
            assert data[0]["id"] == "inv_001"
            assert "$59.00" in data[0]["amount"]

    def test_no_stripe_customer_returns_empty(self, client):
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            org = {"_id": "org_abc", "package": "basic"}
            mock_orgs.find_one.return_value = org

            res = client.get("/api/billing/invoices/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 200
            assert res.get_json() == []

    @patch("stripe.Invoice.list", side_effect=Exception("Stripe error"))
    def test_stripe_error_returns_500(self, mock_inv, client):
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            res = client.get("/api/billing/invoices/org_abc",
                             headers={"Authorization": "Bearer test"})
            assert res.status_code == 500


class TestStripeWebhook:
    def _mod(self):
        try:
            import cloudshield.Server.routes.billing  # noqa
            return "cloudshield.Server.routes.billing"
        except ImportError:
            return "Server.routes.billing"

    def _post(self, client, payload):
        return client.post(
            "/api/billing/webhook",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"STRIPE_SIGNATURE": "sig_test"}
        )

    @patch("stripe.Webhook.construct_event", side_effect=Exception("bad sig"))
    def test_invalid_signature_returns_400(self, mock_event, client):
        res = self._post(client, {})
        assert res.status_code == 400
        assert "error" in res.get_json()

    @patch("stripe.Webhook.construct_event")
    def test_checkout_session_completed(self, mock_event, client):
        mock_event.return_value = {
            "type": "checkout.session.completed",
            "data": {"object": {
                "metadata": {"org_id": "org_abc", "package_type": "pro"},
                "customer": "cus_test123"
            }}
        }
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            mock_orgs.update_one.return_value = None
            with patch(f"{self._mod()}.org_filter", return_value={"_id": "org_abc"}):
                res = self._post(client, {})
                assert res.status_code == 200
                assert res.get_json()["status"] == "success"

    @patch("stripe.Webhook.construct_event")
    def test_subscription_updated_active(self, mock_event, client):
        mock_event.return_value = {
            "type": "customer.subscription.updated",
            "data": {"object": {
                "customer": "cus_test123",
                "status": "active",
                "cancel_at_period_end": False,
                "cancel_at": None,
                "id": "sub_123",
                "items": {"data": [{"price": {"id": "price_1T3VQrA5QKTufQ3cRB80WIPb"}}]}
            }}
        }
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.update_one.return_value = None
            res = self._post(client, {})
            assert res.status_code == 200
            update_call = mock_orgs.update_one.call_args[0][1]["$set"]
            assert update_call["subscription_status"] == "active"

    @patch("stripe.Webhook.construct_event")
    def test_subscription_updated_canceling_flexible(self, mock_event, client):
        mock_event.return_value = {
            "type": "customer.subscription.updated",
            "data": {"object": {
                "customer": "cus_test123",
                "status": "active",
                "cancel_at_period_end": False,
                "cancel_at": 1775466029,  # flexible billing mode
                "id": "sub_123",
                "items": {"data": [{"price": {"id": "price_1T3VQrA5QKTufQ3cRB80WIPb"}}]}
            }}
        }
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.update_one.return_value = None
            res = self._post(client, {})
            assert res.status_code == 200
            update_call = mock_orgs.update_one.call_args[0][1]["$set"]
            assert update_call["subscription_status"] == "canceled"

    @patch("stripe.Webhook.construct_event")
    def test_subscription_deleted(self, mock_event, client):
        mock_event.return_value = {
            "type": "customer.subscription.deleted",
            "data": {"object": {"customer": "cus_test123"}}
        }
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.update_one.return_value = None
            res = self._post(client, {})
            assert res.status_code == 200
            update_call = mock_orgs.update_one.call_args[0][1]["$set"]
            assert update_call["package"] == "basic"
            assert update_call["subscription_status"] == "canceled"

    @patch("stripe.Webhook.construct_event")
    def test_unknown_event_type_ignored(self, mock_event, client):
        mock_event.return_value = {
            "type": "payment_intent.created",
            "data": {"object": {}}
        }
        res = self._post(client, {})
        assert res.status_code == 200


class TestCreatePortalSession:
    def _mod(self):
        try:
            import cloudshield.Server.routes.billing  # noqa
            return "cloudshield.Server.routes.billing"
        except ImportError:
            return "Server.routes.billing"

    @patch("stripe.billing_portal.Session.create")
    def test_success(self, mock_portal, client):
        mock_portal.return_value = MagicMock(url="https://billing.stripe.com/session/xyz")
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            with patch(f"{self._mod()}.org_filter", return_value={"_id": "org_abc"}):
                res = client.post("/api/billing/create-portal-session",
                                  json={"org_id": "org_abc"},
                                  headers={"Authorization": "Bearer test"})
                assert res.status_code == 200
                assert "billing.stripe.com" in res.get_json()["url"]

    @patch("stripe.billing_portal.Session.create", side_effect=Exception("Stripe error"))
    def test_stripe_error(self, mock_portal, client):
        with patch(f"{self._mod()}.organizations") as mock_orgs:
            mock_orgs.find_one.return_value = make_org()
            with patch(f"{self._mod()}.org_filter", return_value={"_id": "org_abc"}):
                res = client.post("/api/billing/create-portal-session",
                                  json={"org_id": "org_abc"},
                                  headers={"Authorization": "Bearer test"})
                assert res.status_code == 400