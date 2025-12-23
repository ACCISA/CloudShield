from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, rsa
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.backends import default_backend
import os
import base64

def generate_ssh_key_pair(private_key_path="id_rsa", passphrase=None):
    """
    Generates an RSA private and public SSH key pair.

    The private key is saved in the secure OpenSSH format and can be
    encrypted with a passphrase. The public key is saved in the standard
    OpenSSH format.

    Args:
        private_key_path (str): The file path for the private key.
        passphrase (str, optional): The passphrase to encrypt the private key.
                                    If None, the key is saved unencrypted.

    Returns:
        tuple: A tuple containing (public_key_path, private_key_path).
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
        backend=default_backend()
    )
    public_key = private_key.public_key()

    if passphrase:
        encryption_algorithm = serialization.BestAvailableEncryption(
            passphrase.encode()
        )
    else:
        encryption_algorithm = serialization.NoEncryption()

    pem_private = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=encryption_algorithm
    )

    with open(private_key_path, "wb") as f:
        f.write(pem_private)

    public_key_path = private_key_path + ".pub"
    comment = "user@host"

    ssh_public_key = public_key.public_bytes(
        serialization.Encoding.OpenSSH,
        serialization.PublicFormat.OpenSSH
    ).decode("utf-8")

    final_public_key_string = f"{ssh_public_key} {comment}\n"

    with open(public_key_path, "w") as f:
        f.write(final_public_key_string)

    return public_key_path, private_key_path

def generate_ed25519_ssh_key(private_key_path="id_ed25519", passphrase=None):
    """
    Generates a new Ed25519 private and public key pair and saves them
    in the standard OpenSSH format.

    Args:
        private_key_path (str): The file path to save the private key.
        passphrase (str, optional): An optional passphrase to encrypt the
                                    private key.
    """
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    if passphrase:
        salt = os.urandom(16)
        kdf = Scrypt(
            salt=salt,
            length=32,
            n=2**14,
            r=8,
            p=1,
            backend=default_backend()
        )
        encryption_algorithm = serialization.BestAvailableEncryption(
            passphrase.encode(),
            kdf=kdf,
            algorithm=serialization.CipherName.AES256,
            mode=serialization.CipherMode.CBC
        )
    else:
        encryption_algorithm = serialization.NoEncryption()

    pem_private = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=encryption_algorithm
    )

    with open(private_key_path, "wb") as f:
        f.write(pem_private)

    comment = "dev@cloudshield"

    raw_public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )

    public_key_type = b"ssh-ed25519"
    ssh_public_key_string = (
        public_key_type + b" " + base64.b64encode(raw_public_bytes) + b" " + comment.encode()
    ).decode("utf-8")

    public_key_path = private_key_path + ".pub"
    with open(public_key_path, "w") as f:
        f.write(ssh_public_key_string + "\n")

    return public_key_path, private_key_path

