"""Flask application entry point.

This module now only creates and configures the Flask application, delegating
route definitions to the routes package and logic to the services layer.
"""
from __future__ import annotations

from flask import Flask
from .logging_setup import logger
from .routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(api_bp)
    logger.debug("Registered api blueprint: %s", api_bp.name)
    return app


# Maintain backwards compatibility if other code imports `app` directly.
app = create_app()


if __name__ == "__main__":  # pragma: no cover
    app.run(debug=True, host="0.0.0.0", port=5000)

