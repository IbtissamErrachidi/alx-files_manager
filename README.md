# ALX Files Manager
A simple platform to upload and view files

## Features
User authentication via a token

List all files

Upload a new file

Change permission of a file

View a file

Generate thumbnails for images


## Install
### Setup the project
First: make sure you have the following programs installed

|                                     | min version |
| ----------------------------------- | ----------- |
| [Node.js](https://nodejs.org/en)    | v12         |
| [MongoDB](https://www.mongodb.com/) | 5.0         |
| [Redis](https://redis.io/)          | 4.0         |

**Clone** the repository
```sh
git clone https://github.com/yahia-soliman/alx-files_manager.git
cd alx-files_manager
```
**Install** the dependencies
```
npm install
```

### Run the API
- In one terminal
```sh
npm run start-server
```

- In another one
```sh
npm run start-worker
```

#### Environment variables
This is a list of environment variables you can specify to the server and the worker processes

| Variable      | Description                                                                   | Default              |
| ------------- | ----------------------------------------------------------------------------- | -------------------- |
| `PORT`        | to specify a port for the Express server                                      | 5000                 |
| `DB_HOST`     | The host machine for MongoDB                                                  | localhost            |
| `DB_PORT`     | Port number of MongoDB server                                                 | 27017                |
| `DB_DATABASE` | Name of the MongoDB database                                                  | `files_manager`      |
| `FOLDER_PATH` | A relative or absolute path for the directory to save the uploaded files into | `/tmp/files_manager` |
