cmake_minimum_required(VERSION 3.28)
set(CMAKE_PREFIX_PATH "/home/cena/.local;${CMAKE_PREFIX_PATH}")
project(cs-rpcsrv)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Protobuf REQUIRED)

# WSL/Ubuntu packages don't ship gRPCConfig.cmake; fall back to pkg-config.
find_package(gRPC QUIET)
if(NOT gRPC_FOUND)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(GRPCPP REQUIRED grpc++)
endif()

set(GENPROTO_LIB "genproto_lib")
set(GENPROTO_DIR "${PROJECT_SOURCE_DIR}/genproto")

file(GLOB_RECURSE PROTO_SRC "${GENPROTO_DIR}/*.pb.cc")
file(GLOB_RECURSE PROTO_HDR "${GENPROTO_DIR}/*.pb.h")

add_library(${GENPROTO_LIB} ${PROTO_SRC} ${PROTO_HDR})

target_link_directories(${GENPROTO_LIB}
    PUBLIC
        $<$<NOT:$<BOOL:${gRPC_FOUND}>>:${GRPCPP_LIBRARY_DIRS}>
)

target_include_directories(${GENPROTO_LIB}
    PUBLIC
        ${GENPROTO_DIR}
    $<$<NOT:$<BOOL:${gRPC_FOUND}>>:${GRPCPP_INCLUDE_DIRS}>
)

target_link_libraries(${GENPROTO_LIB}
    PUBLIC
    protobuf::libprotobuf
    $<$<BOOL:${gRPC_FOUND}>:gRPC::grpc++>
    $<$<NOT:$<BOOL:${gRPC_FOUND}>>:${GRPCPP_LIBRARIES}>
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
    $<$<NOT:$<BOOL:${gRPC_FOUND}>>:${GRPCPP_LIBRARIES}>
)

target_include_directories(${PROJECT_NAME}
    PUBLIC
    ${PROJECT_SOURCE_DIR}/include
)
