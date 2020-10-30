# [Choice] Debian version: buster, stretch
ARG VARIANT=buster
FROM mcr.microsoft.com/vscode/devcontainers/base:${VARIANT}
# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends g++ make libffi-dev bzip2 \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/* /tmp/library-scripts
ENV JUST_HOME=/workspaces/just