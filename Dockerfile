FROM node:13.5-alpine as node
FROM ruby:2.6.5-alpine

RUN apk update && \
        apk upgrade && \
        apk add --no-cache git libxml2-dev libxslt-dev postgresql-dev postgresql-client tzdata bash less && \
        apk add --no-cache sqlite-dev && \
        apk add --virtual build-packages --no-cache build-base curl-dev && \
        cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime

RUN mkdir /app
WORKDIR /app
ENV LANG=ja_JP.UTF-8
ENV BUNDLE_JOBS=4
ENV BUNDLE_RETRY=3

# Install nodejs yarn
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /opt/yarn-* /opt/yarn
RUN ln -s /usr/local/bin/node /usr/local/bin/nodejs && \
        ln -s /opt/yarn/bin/yarn /usr/local/bin/yarn

COPY Gemfile /app/Gemfile
COPY Gemfile.lock /app/Gemfile.lock
RUN bundle install

COPY . /app

# Add a script to be executed every time the container starts.
COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
EXPOSE 3000

# Start the main process.
CMD ["rails", "server", "-b", "0.0.0.0"]
