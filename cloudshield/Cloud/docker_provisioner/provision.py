import os
from python_on_whales import DockerClient

docker = DockerClient(compose_files=["/app/docker-compose.yml"])

# In our test env, to be efficient we will build our infra now. We can assume that during testing
# we are probably going to be provisioning infra. When we provision we will just docker compose up.

docker.compose.build(
    services=["samba-test", "openvpn-test"]
)

# MAIN
def provision_network_docker(org_id, region, templates_dir, generated_dir, count, server_logger):
    server_logger.info("Running docker provisioning")

    os.environ["DOMAIN_NAME"] = "ANISS"
    os.environ["DC_ADMIN_PASSWORD"] = "4162728abb29acc12090e6432cdb6fd8%$@!"
    os.environ["REALM_NAME"] = "ANISS.LOCAL"
    
    # We already built our containers so just start them
    docker.compose.run(
        service="samba-test",
        detach=True,
        tty=False,
        envs={
        "DOMAIN_NAME": "ANISS",
        "DC_ADMIN_PASSWORD": "4162728abb29acc12090e6432cdb6fd8%$@!",
        "REALM_NAME": "ANISS.LOCAL"
        }
    )

    docker.compose.run(
        service="openvpn-test",
        detach=True,
        tty=False
    )

def get_target_dir():
    pass

def destroy_network_docker():
    pass
