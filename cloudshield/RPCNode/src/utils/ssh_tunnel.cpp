#include "utils/ssh_tunnel.hpp"

int GetRandomAvailablePort() {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == -1) return -1;

    sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = 0; // OS picks a random port

    if (bind(sock, (struct sockaddr*)&addr, sizeof(addr)) == -1) {
        close(sock);
        return -1;
    }

    socklen_t len = sizeof(addr);
    getsockname(sock, (struct sockaddr*)&addr, &len);
    int port = ntohs(addr.sin_port);

    close(sock); // Free it so SSH can use it
    return port;
}
