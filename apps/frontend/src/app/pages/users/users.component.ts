import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [IonContent]
})
export class UsersComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
