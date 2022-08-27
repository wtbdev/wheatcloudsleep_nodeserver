const net = require('net');
var FastScanner = require('fastscan');
const { time } = require('console');


// 端口
const port = 11451;
const addr = '0.0.0.0';

var clients = {};
var clientCount = 0;
// 关键词
const filterWords = ['操你妈', '傻逼'];
var scanner = new FastScanner(filterWords);

// 聊天字数限制
var chatLimit = 20;

// 创建服务器
const server = new net.createServer();

function parseMsg(msg) {
    //删除分隔符
    msg = ('' + msg).replace('\0', '');
    let split = ('' + msg).split('$', 2);
    console.log(split);
    //格式化数据
    return {
        type: split[0],
        msg: split[1]
    };
}

function broadcast(command, data, id) {
    // console.log(clients);
    for (cli in clients) {
        clients[cli].send(command, data, id);
    }
}

// 求个优化(
function sendPlayerList(cliToSend) {
    for (cliToFetch in clients) {
        // 遍历得到的是key, 需要转成socket对象
        cliToFetch = clients[cliToFetch];
        if (cliToSend == cliToFetch) continue;
        cliToSend.send('sleeper', cliToFetch.id, cliToFetch.id);
        // 后面的如果要节约带宽可以注释，目前测试发送姓名没什么用（
        cliToSend.send('name', `[${cliToFetch.id}]` + cliToFetch.name, cliToFetch.id);
        cliToSend.send('type', cliToFetch.type, cliToFetch.id);
    }
    // 添加一个bot作为server
    cliToSend.send('sleeper', 0, 0);
    cliToSend.send('name', 'SERVER', 0);
    cliToSend.send('type', 1, 0);
}

server.on('connection', (client) => {
    client.send = (command, data, id = client.id) => {
        client.write(`${id}\0${command}$${data}\0`)
    }
    client.id = ++clientCount; // 给每一个client起个名
    client.name = 'unnamed'; //默认名称
    client.type = 0; // 默认类型
    clients[client.id] = client; // 将client保存在clients
    console.log(`客户端 ${client.id} 上线了`);
    // 发送客户端id
    client.send('yourid', client.id);
    // 广播客户端id
    broadcast('sleeper', client.id, 0);
    // 发送玩家列表
    sendPlayerList(client);

    //判断超时玩家
    for (cli in clients) {
        if((new Date().getTime() - clients[cli].responseTime) >= 5000) {
            clients[cli].end();
        }
    }
    //client.send('pos', '0,0')
    
    client.on('data', function (msg) { //接收client发来的信息
        //console.log(msg);
        msg = parseMsg(msg);
        console.log(`[${client.id}][${msg.type}] ${msg.msg}`);
        //消息处理
        switch (msg.type) {
            case 'name':
                broadcast('name', `[${cliToFetch.id}]` + msg.msg, client.id);
                // 长度判断
                if(msg.msg.length < 4 || msg.msg.length > 15) {
                    client.send('chat', '你的名字过长或者过短，请修改！', 0)
                    client.end();
                }
                client.name = msg.msg;
                broadcast('chat', `玩家 ${client.name} 加入了！`, 0);
                break;
            case 'type':
                broadcast('type', msg.msg, client.id);
                client.type = msg.msg;
                break;
            case 'chat':
                // 聊天分析
                // 指令不受限制
                if (('' + msg.msg).startsWith('/')) {
                    if (('' + msg.msg).startsWith('/version')) {
                        client.send('chat', 'WheatSleep Server NODEJS v0.1');
                    }
    
                    if (('' + msg.msg).startsWith('/list')) {
                        client.send('chat', `当前在线:${clientCount}`);
                    }
    
                    if (('' + msg.msg).startsWith('/tp ')) {
                        let id = ('' + msg.msg).replace('/tp ', '');
                        if (clients[id] != undefined) {
                            broadcast('move', `${clients[id].x},${clients[id].y}`, client.id);
                            //client.send('chat', 'WheatSleep Server NODEJS v0.1');
                        } else {
                            client.send('chat', '玩家不存在！')
                        }
                    }
                } else {
                    // 字数上限
                    if (('' + msg.msg).length >= chatLimit) {
                        client.send('chat', '超过字数限制！');
                        break;
                    }
                    // 关键词检测
                    if (scanner.search(msg.msg).length == 0) {
                        broadcast('chat', msg.msg, client.id);
                    } else {
                        broadcast('chat', '我是傻宝', client.id);
                    }
                }

                break;
            case 'move':
                broadcast('move', msg.msg, client.id);
                break;
            case 'pos':
                broadcast('pos', msg.msg, client.id);
                let pos = ('' + msg.msg).split(',', 2);
                let x = pos[0];
                let y = pos[1];
                client.x = x;
                client.y = y;
                client.responseTime = new Date().getTime();
                break;
            case 'sleep':
                broadcast('sleep', msg.msg, client.id);
                break;
            case 'getup':
                broadcast('getup', msg.msg, client.id);
                break;
        }
    });

    client.on('error', function (e) { //监听客户端异常
        console.log('client error' + e);
        client.end();
    });

    client.on( 'close', function () {
        delete clients[client.id];
        clientCount--;
        console.log(`客户端${ client.id }下线了`);
        broadcast('leave', client.id, client.id);
        broadcast('chat', `玩家 ${client.name} 离开了！`, 0);
    });

});

server.listen( port,addr,function () {
  console.log(`服务器运行在：http://${addr}:${port}`);
});