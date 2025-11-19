"""Server component of CloudShield.

Expose :func:`create_app` lazily so importing this package does not eagerly
initialise heavy dependencies (Mongo, Redis) during unit tests.
"""


def create_app(*args, **kwargs):  # pragma: no cover - thin wrapper
	from .server import create_app as _create_app

	return _create_app(*args, **kwargs)
