import { Component, inject, OnInit } from '@angular/core';
import {  ModalController } from '@ionic/angular/standalone';
import {UsersStore} from "../../services/users/users.store";
import {User, UserRole} from "@brado/types";
import { IonicModule } from '@ionic/angular';
import { NgFor, NgIf } from '@angular/common';
import {AddUserModalComponent} from "../../components/add-new-user-modal/add-new-user-modal.component";

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [NgFor, NgIf, IonicModule],
  providers: [ModalController]
})
export class UsersComponent  implements OnInit {

  usersStore = inject(UsersStore)
  roles: string[] = ['worker', 'admin', 'super_admin'];

  constructor( private modalCtrl: ModalController) { }

  ngOnInit() {
    this.usersStore.loadAll()
  }

  onRoleChange(user: User, newRole: UserRole) {
    if (user.role !== newRole) {
      this.usersStore.update(user.id, { role: newRole });
    }
  }

  async openAddUserModal() {
    const modal = await this.modalCtrl.create({
      component: AddUserModalComponent,
    });
    modal.present();

    const { data, role } = await modal.onDidDismiss();
    if (role === 'confirm' && data) {
      this.usersStore.create(data);
    }
  }
}
