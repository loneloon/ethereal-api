# Ethereal API

## Intro:

Ethereal API is an authetication platform project.
The main purpose of this platform is to manage user authentication on behalf of connected applications.

## Platform design:

Platform controllers run on two separate sets of persistence (2 databases): AUP and SSD model sets. Persistence management is implemented through Prisma.

### AUP: Application, User, Projection

- aup schema defines user, application and user-app projection models
- aup persistence (db) should be orm-based, because projection model refers to a parent user and a parent app

  - User:

    - describes base platform user
    - is independent and incognizant of applications
    - has a linked secret, can be referred to by sessions and user-projections
    - stores unique email, username, real name

  - Application:

    - describes connected application
    - is independent and incognizant of users
    - has a linked autogenerated secret, can be referred to by user-projections
    - stores unique application name, contact email, url

  - Projection (User-Projection/App-User):
    - describes a relationship between an app and a user
    - includes references to parent app and user
    - stores alias (alternative username), app-data (stringified json, that can be used as a config for the app or store real parameters, memorize app related data i.e. darkMode: true or personalBestScore: 999999)

### SSD: Session, Secret, Device

- ssd schema defines session, secret and device models
- persistence (db) should be orm-based, because session model refers to a parent device

  - Session:

    - describes user session
    - refers to a platform user and a unique device, acts as a fact for user-auth on a specific device

  - Secret:

    - describes a secret for user or app authentication
    - stores user passwords/autogenerated app codes as bcrypt hashes

  - Device:
    - describes a user device that user has signed-in with
    - stores userAgent, device ip, can have one session maximum

Current version of Ethereal API uses Express framework for routing and request handling. Each route + request type combination has a dedicated handler that processes incoming request. Routes are assigned in the root index.js. Platform persistence management heavily relies on prisma clients so the top level logic, config and api initialization is wrapped within an async 'main' function. If 'main' function is terminated or interrupted, prisma clients will be orderly disconnected.

## Expected usage:

To connect an application to the platform, you need to:

- register it within the platform
- upon registration app access key and backup-code will be provided to the app owner
- app key should be included in most of the app related requests for authentication
- backup code can be used to reset current app key pair
- app management actions will be authorized with said app key included in requests to the api

To register as a platform user or an app user, you need to:

- sign up for the platform
- user authentication is session based: a session cookie will be included in the header if user signs in successfully
- any user, that is registered on the platform may join existing apps
- upon joining the app a user to app projection record will be created
- user projection can have a separate username specifically for the app (alias) and custom app-data that can be stored as a stringified json

## Roadmap:

- add unit tests for services, mappers, controllers and handlers
- add update operaton validation: if property delta is resolved to nothing, update should be declined. (i.e. you're trying to update username to the same string)
- ethereal api sdk: including base client for app integration
- extract magic strings/parameters that can/should be configurable on platform deployment/start-up
