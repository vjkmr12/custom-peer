var path = require('path')
  , pkg = require('./package.json')
  , fs = require('fs')
  , version = pkg.version
  , PeerServer = require('./lib').PeerServer
  , util = require('./lib/util');

var opts = {
	debug: true,
	key: 'lwjd5qra8257b9',
	port: process.env.PORT || '9000',
	path: '/',
	allow_discovery: true
};

if (opts.sslkey || opts.sslcert) {
  if (opts.sslkey && opts.sslcert) {
    opts.ssl = {
      key: fs.readFileSync(path.resolve(opts.sslkey)),
      cert: fs.readFileSync(path.resolve(opts.sslcert))
    }

    delete opts.sslkey;
    delete opts.sslcert;
  } else {
    util.prettyError('Warning: PeerServer will not run because either ' +
      'the key or the certificate has not been provided.');
    process.exit(1);
  }
}

var userPath = opts.path;
var server = PeerServer(opts, function(server) {
  var host = server.address().address;
  var port = server.address().port;

  console.log(
    'Started PeerServer on %s, port: %s, path: %s (v. %s)',
    host, port, userPath || '/', version
  );
});

function heartbeat() {
  this.isAlive = true;
}

server._wss.on('connection', function(ws) {
  var wsPingTimer;

  ws.isAlive = true;
  ws.on('pong', heartbeat);

  var scheduleHeartbeat = function() {
    wsPingTimer = setTimeout(() => { sendHeartbeat() }, 20000);
  }

  var sendHeartbeat = function() {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }

    ws.isAlive = false;
    ws.ping();

    scheduleHeartbeat();
  }

  ws.on('close', function() {
    clearTimeout(wsPingTimer);
  });

  scheduleHeartbeat();
});

