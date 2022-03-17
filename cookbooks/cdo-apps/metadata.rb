name             'cdo-apps'
maintainer       'Code.org'
maintainer_email 'will@code.org'
license          'All rights reserved'
description      'Installs/Configures cdo-apps'
long_description IO.read(File.join(File.dirname(__FILE__), 'README.md'))
version          '0.2.503'

depends 'apt'
depends 'build-essential'
depends 'yarn'

depends 'cdo-cloudwatch-agent'
depends 'cdo-repository'
depends 'cdo-secrets'
depends 'cdo-postfix'
depends 'cdo-varnish'
depends 'cdo-mysql'
depends 'cdo-ruby'
depends 'sudo-user'
depends 'chef_client_updater'
depends 'cdo-nginx'
depends 'cdo-nodejs'
depends 'cdo-java-7'
depends 'cdo-redis'
depends 'cdo-i18n'
depends 'cdo-analytics'
depends 'cdo-syslog'
depends 'cdo-jemalloc'
depends 'cdo-tippecanoe'
