# Frozen verification image. Manifests are *.snapshot and lockfiles are gone.
# This image is not built. Do not restore a lockfile. See README.
FROM ruby:2.6.5-slim

ENV TZ Asia/Tokyo
ENV LANG C.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV BUNDLE_JOBS 4
ENV BUNDLE_RETRY 3

WORKDIR /app
COPY Gemfile.snapshot /app/Gemfile.snapshot
COPY package.json.snapshot /app/package.json.snapshot

RUN apt-get update \
        && apt-get install -y less bash curl nodejs mariadb-client libsqlite3-dev build-essential libpq-dev libmariadb-dev imagemagick \
        && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
        && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
        && apt-get update \
        && apt-get install -y yarn

RUN gem install bundler \
        && rm -rf /usr/local/bundle/cache/* /usr/local/share/.cache/* /var/cache/* /tmp/*

COPY . /app

# Add a script to be executed every time the container starts.
COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
EXPOSE 3000

# Start the main process.
CMD ["rails", "server", "-b", "0.0.0.0"]
