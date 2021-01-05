.global _binary_lib_fs_js_start
_binary_lib_fs_js_start:
        .incbin "lib/fs.js"
        .global _binary_lib_fs_js_end
_binary_lib_fs_js_end:
.global _binary_lib_loop_js_start
_binary_lib_loop_js_start:
        .incbin "lib/loop.js"
        .global _binary_lib_loop_js_end
_binary_lib_loop_js_end:
.global _binary_lib_path_js_start
_binary_lib_path_js_start:
        .incbin "lib/path.js"
        .global _binary_lib_path_js_end
_binary_lib_path_js_end:
.global _binary_lib_process_js_start
_binary_lib_process_js_start:
        .incbin "lib/process.js"
        .global _binary_lib_process_js_end
_binary_lib_process_js_end:
.global _binary_lib_build_js_start
_binary_lib_build_js_start:
        .incbin "lib/build.js"
        .global _binary_lib_build_js_end
_binary_lib_build_js_end:
.global _binary_lib_repl_js_start
_binary_lib_repl_js_start:
        .incbin "lib/repl.js"
        .global _binary_lib_repl_js_end
_binary_lib_repl_js_end:
.global _binary_lib_configure_js_start
_binary_lib_configure_js_start:
        .incbin "lib/configure.js"
        .global _binary_lib_configure_js_end
_binary_lib_configure_js_end:
.global _binary_lib_acorn_js_start
_binary_lib_acorn_js_start:
        .incbin "lib/acorn.js"
        .global _binary_lib_acorn_js_end
_binary_lib_acorn_js_end:
.global _binary_just_cc_start
_binary_just_cc_start:
        .incbin "just.cc"
        .global _binary_just_cc_end
_binary_just_cc_end:
.global _binary_Makefile_start
_binary_Makefile_start:
        .incbin "Makefile"
        .global _binary_Makefile_end
_binary_Makefile_end:
.global _binary_main_cc_start
_binary_main_cc_start:
        .incbin "main.cc"
        .global _binary_main_cc_end
_binary_main_cc_end:
.global _binary_just_h_start
_binary_just_h_start:
        .incbin "just.h"
        .global _binary_just_h_end
_binary_just_h_end:
.global _binary_just_js_start
_binary_just_js_start:
        .incbin "just.js"
        .global _binary_just_js_end
_binary_just_js_end:
.global _binary_lib_inspector_js_start
_binary_lib_inspector_js_start:
        .incbin "lib/inspector.js"
        .global _binary_lib_inspector_js_end
_binary_lib_inspector_js_end:
.global _binary_lib_websocket_js_start
_binary_lib_websocket_js_start:
        .incbin "lib/websocket.js"
        .global _binary_lib_websocket_js_end
_binary_lib_websocket_js_end:
.global _binary_config_js_start
_binary_config_js_start:
        .incbin "config.js"
        .global _binary_config_js_end
_binary_config_js_end:
