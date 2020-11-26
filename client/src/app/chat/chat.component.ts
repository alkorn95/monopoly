import { Component, OnInit, ViewChildren, ViewChild, AfterViewInit, QueryList, ElementRef, Input } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatList, MatListItem } from '@angular/material/list';

import { Action } from './shared/model/action';
import { Event } from './shared/model/event';
import { Message } from './shared/model/message';
import { User } from './shared/model/user';
import { SocketService } from './shared/services/socket.service';
import { DialogUserComponent } from './dialog-user/dialog-user.component';
import { DialogUserType } from './dialog-user/dialog-user-type';
import { TranslateService } from '@ngx-translate/core';
import { StoreUserService } from './shared/services/store-user.service';



@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  @Input() money: string;
  action = Action;
  style: number;
  user: User;
  users: User[];
  messages: string[] = [];
  moneys: string[] = [];
  names: string[] = [];
  messageContent: string;
  ioConnection: any;
  storedUserName: string;
  dialogRef: MatDialogRef<DialogUserComponent> | null;
  defaultDialogUserParams: any = {
    disableClose: true,
    data: {
      title: 'Welcome',
      title_pt: 'Bem-vindo',
      dialogType: DialogUserType.NEW
    }
  };

  // getting a reference to the overall list, which is the parent container of the list items
  @ViewChild(MatList, { read: ElementRef, static: true }) matList: ElementRef;

  // getting a reference to the items/messages within the list
  @ViewChildren(MatListItem, { read: ElementRef }) matListItems: QueryList<MatListItem>;

  constructor(private socketService: SocketService,
    private storedUser: StoreUserService,
    public dialog: MatDialog, private translate: TranslateService) {
  }

  ngOnInit(): void {
    this.initModel();
    this.style = 0;
    // Using timeout due to https://github.com/angular/angular/issues/14748
    setTimeout(() => {
      this.openUserPopup(this.defaultDialogUserParams);
    }, 0);
  }



  private initModel(): void {
    const randomId = this.getRandomId();
    this.user = {
      id: randomId,
    };
  }

  private initIoConnection(): void {
    this.socketService.initSocket();

    this.ioConnection = this.socketService.onMessage()
      .subscribe((message: Message) => {
        let msg = "";
        if (message.from.name == this.user.name)
          msg = " ";
        if (message.action == undefined) {
          msg += message.content.split("|")[2];
          this.names = message.content.split("|")[0].split(",");
          this.moneys = message.content.split("|")[1].split(",");
          for (let i = 0; i < this.names.length; i++) {
            this.moneys[i] = this.names[i] + " " + this.moneys[i];
          }
        }
        if (message.action == Action.JOINED) {
          msg += message.from.name + " подключился"
          if (message.from.name == this.user.name)
            this.socketService.send({
              from: this.user,
              content: this.user.name + ",update,0"
            });
        }
        if (message.action == Action.LEFT)
          msg += message.from.name + " вышел"
        if (!msg.includes("update"))
        if(!(this.names.includes(message.from.name)&&message.action == Action.JOINED))
          this.messages.push(msg);
        if (this.messages.length > 200)
          this.messages = this.messages.slice(1);
        setTimeout(() => {
          var elem = document.getElementById('chat');
          elem.scrollTop = elem.scrollHeight;
        }, 1);
      });


    this.socketService.onEvent(Event.CONNECT)
      .subscribe(() => {
        console.log('connected');
      });

    this.socketService.onEvent(Event.DISCONNECT)
      .subscribe(() => {
        console.log('disconnected');
      });
  }

  private getRandomId(): number {
    return Math.floor(Math.random() * (1000000)) + 1;
  }


  private openUserPopup(params): void {
    this.dialogRef = this.dialog.open(DialogUserComponent, params);
    this.dialogRef.afterClosed().subscribe(paramsDialog => {
      if (!paramsDialog) {
        return;
      }
      this.storedUserName = this.storedUser.getStoredUser();

      this.user.name = paramsDialog.username;


      this.storedUser.storeUser(this.user.name);
      this.initIoConnection();
      this.sendNotification(paramsDialog, Action.JOINED);

    });
  }

  public sendMessage(message: string): void {
    if (!message) {
      return;
    }

    this.socketService.send({
      from: this.user,
      content: message
    });
    this.messageContent = null;
  }

  public toBank(): void {
    if (this.money == undefined)
      return;
    this.socketService.send({
      from: this.user,
      content: this.user.name + ",bank," + this.money
    });
    //(<HTMLInputElement>document.getElementById('inp')).value = '';
    this.money = undefined;

  }
  public fromBank(): void {
    if (this.money == undefined)
      return;
    this.socketService.send({
      from: this.user,
      content: "bank," + this.user.name + "," + this.money
    });
    // (<HTMLInputElement>document.getElementById('inp')).value = '';
    this.money = undefined;
  }
  public toPlayer(pName: string): void {

    if (this.money == undefined)
      return;
    this.socketService.send({
      from: this.user,
      content: this.user.name + "," + pName + "," + this.money
    });
    // (<HTMLInputElement>document.getElementById('inp')).value = '';
    this.money = undefined;
  }

  public sendNotification(params: any, action: Action): void {
    let message: Message;
    message = {
      from: this.user,
      action
    };
    this.socketService.send(message);
  }

  public switchStyle(): void {
    if (this.style != 1) {
      this.style++;
      document.body.style.backgroundColor = "black";
    }
    else {
      this.style = 0;
      document.body.style.backgroundColor = "white";
    }
  }


}
