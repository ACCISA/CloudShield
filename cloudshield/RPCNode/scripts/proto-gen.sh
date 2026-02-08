#!/bin/bash
CURRENT_DIR=$(pwd)

mkdir -p "$CURRENT_DIR/genproto"

rm -rf "$CURRENT_DIR/genproto/"*

find "$CURRENT_DIR/protos/" -mindepth 1 -type d | while IFS= read -r module; do
    protoc -I "$CURRENT_DIR/protos/" -I "$module" \
	    --cpp_out="$CURRENT_DIR/genproto/" \
	    --grpc_out="$CURRENT_DIR/genproto/" \
	    --plugin=protoc-gen-grpc="$(which grpc_cpp_plugin)" \
	    "$module"/*.proto
done
