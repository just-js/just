ARG VARIANT=buster
FROM mcr.microsoft.com/vscode/devcontainers/base:${VARIANT}
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends g++ make libffi-dev bzip2 gdb \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/* /tmp/library-scripts
## used by modules for just.h - needed for "runtime-builder" build
ENV JUST_HOME=/workspaces/just
## add just
ENV LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib/just
## target directory for "just build"
ENV JUST_TARGET=/workspaces/just
EXPOSE 9222 3000