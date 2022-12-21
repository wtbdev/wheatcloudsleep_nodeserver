const net = require('net');
// var FastScanner = require('fastscan');
const { time } = require('console');


// 端口
const port = 11451;
const addr = '0.0.0.0';

var clients = {};
var clientCount = 0;
// 关键词
const filterWords = ['操你妈', '傻逼'];
// var scanner = new FastScanner(filterWords);

// 聊天字数限制
var chatLimit = 20;

// 创建服务器
const server = new net.createServer();

function broadcast(command, data, id) {
    // console.log(clients);
    for (cli in clients) {
        clients[cli].send({
            Cmd: command,
            Args: data,
            Id: id
        });
    }
}

function broadcast(object) {
    for (cli in clients) {
        clients[cli].send(object);
    }
}

function sendSleeperData(client) {
    for (sid in clients) {
        if (sid == client.id) continue;
        client.send({
            Cmd: 'sleeper',
            Args: [sid],
            Id: sid
        });

        client.send({
            Cmd: 'name',
            Args: [clients[sid].name],
            Id: sid
        })

        client.send({
            Cmd: 'type',
            Args: [clients[sid].type],
            Id: sid
        })
    }
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

server.on('connection', (client) => {
    client.send = (object) => {
        client.write(JSON.stringify(object) + "\0");
    }
    clientCount++;
    let sid = getRndInteger(0, 30000)
    // 防止sid重复
    while(clients[sid] != undefined) {
        sid = getRndInteger(0, 30000)
    }
    client.id = sid// 给每一个client起个名
    client.name = 'unnamed'; //默认名称
    client.type = 0; // 默认类型
    clients[client.id] = client; // 将client保存在clients
    console.log(`客户端 ${client.id} 上线了`);
    //发送guid
    client.send({
        Cmd: 'packguid',
        Args: ['{94D448BA-AEFA-4C87-A5F8-36F6640E2F67}']
    });

    // 发送玩家id
    client.send({
        Cmd: 'yourid',
        Args: [client.id],
        Id: client.id
    });

    // 发送当前玩家信息
    sendSleeperData(client);

    //判断超时玩家
    for (cli in clients) {
        if((new Date().getTime() - clients[cli].responseTime) >= 5000) {
            clients[cli].end();
        }
    }
    
    client.on('data', function (msg) { //接收client发来的信息
        //console.log(msg);
        msg = JSON.parse(String(msg).replace('\0', ''));
        console.log(msg);
        msg.Id = client.id;
        switch (msg.Cmd) {
            case 'name':
                client.name = msg.Args[0]
            case 'type':
                client.type = msg.Args[0]
            case 'chat':
            case 'pos':
            case 'move':
            case 'emote':
                broadcast(msg);
                break;
        }
        if (msg.type = 'name') {
            
        } 
    });

    client.on('error', function (e) { //监听客户端异常
        console.log('client error' + e);
        client.end();
    });

    client.on( 'close', function () {
        delete clients[client.id];
        clientCount--;
        console.log(`客户端 ${ client.id } 下线了`);
    });

});

server.listen( port,addr,function () {
  console.log(`服务器运行在：http://${addr}:${port}`);
});
