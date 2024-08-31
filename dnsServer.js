const dgram = require('dgram') //UDP module for creating the server
const server = dgram.createSocket('udp4') //creating a UDP server

function parseDomainName(msg) {
    let domainParts = []
    let i = 12; //the domain name starts after first 12bytes in a DNS request 

    while (msg[i] !== 0) {
        let length = msg[i]
        let part = msg.slice(i+1,i+1+length).toString()
        domainParts.push(part)
        i += length + 1 
    }

    return domainParts
}

function createDNSResponse(msg,ipAddress) {
    let response = Buffer.alloc(msg.length + 16)

    msg.copy(response)

    //Set the response code to 0 (no error)
    response[2] =  0x81 //set Q/R (query/response) flag to indicate a response 
    response[3] = 0x80 //set response code to NoError

    //answer section 
    response.writeUInt16BE(1,6) //Set the number of answers to 1 

    //copy the query section to answer section 
    msg.copy(response,msg.length,12,msg.length)

    //append the answer 
    let offset = msg.length
    response.writeUInt16BE(0xc00c, offset); // Name pointer to the query name
    response.writeUInt16BE(0x0001, offset + 2); // Type A (host address)
    response.writeUInt16BE(0x0001, offset + 4); // Class IN
    response.writeUInt32BE(300, offset + 6); // TTL (Time to Live)
    response.writeUInt16BE(4, offset + 10); // Data length (4 bytes for IPv4)
    response.writeUInt32BE(ipToInteger(ipAddress), offset + 12); // IP address

    return response 
}

function ipToInteger(ip) {
    return ip.split('.').reduce((int, octet) => {
        return (int << 8) | parseInt(octet, 10);
    }, 0) >>> 0;
}

server.on('message' , (msg,rinfo) => {
    console.log(`Received message from ${rinfo.address}:${rinfo.port}`);
    
    //parse the DNS request 
    const domainName = parseDomainName(msg)
    console.log(`Domain name requested : ${domainName}`);
    
    //for simplicity, let's return a hardcoded ip address 
    const ipAddress = '192.168.1.1'

    //generate a response message
    const response = createDNSResponse(msg,ipAddress)

    //Send the response back to the client 
    server.send(response ,0,response.length , rinfo.port , rinfo.address, () => {
        console.log(`Sent response to ${rinfo.address}:${rinfo.port}`);
    })
    
})

server.bind(53, () => {
    console.log("DNS Server running on PORT 53");
    
})