import { Component, inject, OnInit, signal } from '@angular/core';
import {AuthService} from "../../services/auth/auth.service";
import {AuthUiService} from "../../services/auth/auth-ui-service";
import { IonHeader, IonToolbar, IonTitle,  IonButtons, IonButton } from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';



@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf, IonHeader, IonToolbar, IonTitle,  IonButtons, IonButton],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  private auth = inject(AuthService);
  private authUi = inject(AuthUiService);

  username = signal<string | null>(null);
  loggedIn = signal(false);

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    console.log(user)
    this.loggedIn.set(!!user);

    this.username.set(user?.username ?? null);
  }

  async login() {
    const success = await this.authUi.openLoginModal();
    if (success) {
      const user = this.auth.getCurrentUser();
      this.loggedIn.set(!!user);
      this.username.set(user?.username ?? null);
    }
  }



  logout() {
    this.auth.logout();
    this.loggedIn.set(false);
    this.username.set(null);
  }
}
