import express from "express";
import cors from "cors";
import * as http from "http";
import { Message, User } from "./model";
import fs from "fs";


export class ChatServer {
  public static readonly PORT: number = 3000;
  private app: express.Application;
  private server: http.Server;
  private io: SocketIO.Server;
  private port: string | number;

  constructor() {
    this.createApp();
    this.config();
    this.createServer();
    this.sockets();
    this.listen();
  }

  private createApp(): void {
    this.app = express();
    this.app.use(cors());
  }

  private createServer(): void {
    this.server = http.createServer(this.app);
  }

  private config(): void {
    this.port = process.env.PORT || ChatServer.PORT;
  }

  private sockets(): void {
    this.io = require("socket.io").listen(this.server, { origins: '*:*' });
  }

  private listen(): void {
    this.server.listen(this.port, () => {
      console.log("Running server on port %s", this.port);
    });

    this.io.on("connect", (socket: any) => {
      console.log("Connected client on port %s.", this.port);
      socket.on("message", (m: Message) => {
        console.log("[server](message): %s", JSON.stringify(m));
        let data = fs.readFileSync("1.txt", "utf8");
        let users = new Array();
        let moneys = new Array();
        let datas = data.split('\n');
        for (let i = 0; i < datas.length / 2 - 1; i++) {
          users.push(datas[i * 2].replace('\r', ''));
          moneys.push(datas[i * 2 + 1].replace('\r', ''));
        }
        if (m.content == undefined) {
          this.io.emit("message", m);
          return;
        }
        let isZero = false;
        let currentUser = m.content.split(',')[0];
        let toUser = m.content.split(',')[1];
        let money = parseInt(m.content.split(',')[2]) - parseInt(m.content.split(',')[2]) % 10;
        if (money == NaN || money < 0)
          money = 0;
        if (currentUser == "bank" && !users.includes(toUser)) {
          users.push(toUser);
          moneys.push(money);
        }
        else if (currentUser == "bank" && users.includes(toUser)) {
          let mon = parseInt(moneys[users.indexOf(toUser)]);
          mon += money;
          moneys[users.indexOf(toUser)] = mon + "";
        }


        if (toUser == "bank" && users.includes(currentUser)) {
          let mon = parseInt(moneys[users.indexOf(currentUser)]);
          mon -= money;
          if (mon < 0) {
            isZero = true;
            mon += money;
          }
          moneys[users.indexOf(currentUser)] = mon + "";
        }

        if (users.includes(toUser) && users.includes(currentUser)) {
          let mon1 = parseInt(moneys[users.indexOf(currentUser)]);
          mon1 -= money;
          if (mon1 < 0) {
            isZero = true;
            mon1 += money;
          }
          moneys[users.indexOf(currentUser)] = mon1 + "";

          if (!isZero) {
            let mon2 = parseInt(moneys[users.indexOf(toUser)]);
            mon2 += money;
            moneys[users.indexOf(toUser)] = mon2 + "";
          }
        }

        fs.writeFileSync("1.txt", "");
        for (let i = 0; i < users.length; i++) {
          fs.appendFileSync("1.txt", users[i] + "\n");
          fs.appendFileSync("1.txt", moneys[i] + "\n");
        }


        let n = new Message(m.from, users + "|" + moneys + "|" + currentUser + ">>>" + toUser + " " + money);
        if (currentUser == "bank")
          n = new Message(m.from, users + "|" + moneys + "|" + toUser + " ПОЛУЧИЛ " + money);
        if (toUser == "bank")
          n = new Message(m.from, users + "|" + moneys + "|" + currentUser + " ОТДАЛ " + money);
        if (isZero)
          n = new Message(m.from, users + "|" + moneys + "|" + currentUser + " хотел заплатить " + money + ", но у него закончились деньги");
        if (currentUser == "new game" && money == 2330) {
          fs.writeFileSync("1.txt", "");
          n = new Message(m.from, users + "|" + moneys + "|" + "Новая игра");
        }
        if (money != 0 || toUser == "update")
          this.io.emit("message", n);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
