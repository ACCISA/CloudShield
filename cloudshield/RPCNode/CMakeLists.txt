cmake_minimum_required(VERSION 3.28)
set(CMAKE_PREFIX_PATH "/home/cena/.local;${CMAKE_PREFIX_PATH}")
project(cs-rpcsrv)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Protobuf REQUIRED)
find_package(gRPC REQUIRED)
find_package(utf8_range REQUIRED)

set(GENPROTO_LIB "genproto_lib")
set(GENPROTO_DIR "${PROJECT_SOURCE_DIR}/genproto")

file(GLOB_RECURSE PROTO_SRC "${GENPROTO_DIR}/*.pb.cc")
file(GLOB_RECURSE PROTO_HDR "${GENPROTO_DIR}/*.pb.h")

add_library(${GENPROTO_LIB} ${PROTO_SRC} ${PROTO_HDR})

target_include_directories(${GENPROTO_LIB}
    PUBLIC
        ${GENPROTO_DIR}
)

target_link_libraries(${GENPROTO_LIB}
    PUBLIC
        protobuf::libprotobuf
        gRPC::grpc++
        utf8_range::utf8_range
        utf8_range::utf8_validity
)

protobuf_generate_cpp(PROTO_SRCS PROTO_HDRS my_message.proto)

add_executable(${PROJECT_NAME}
    src/main.cpp
    src/service/infra_service.cpp
    src/service/vpn_service.cpp
    src/server/server.cpp
    src/utils/utils.cpp
    src/utils/exec.cpp
    src/utils/ssh_tunnel.cpp
    src/tasks/samba.cpp
    src/tasks/openvpn.cpp
    src/tasks/CreateSambaFileShare/task.cpp
)

target_link_libraries(${PROJECT_NAME}
    PRIVATE
    ${GENPROTO_LIB}
)

target_include_directories(${PROJECT_NAME}
    PUBLIC
    ${PROJECT_SOURCE_DIR}/include
)
