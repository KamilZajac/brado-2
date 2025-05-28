import { Component, inject, OnInit, signal } from '@angular/core';
import {AuthService} from "../../services/auth/auth.service";
import {AuthUiService} from "../../services/auth/auth-ui-service";
import { IonHeader, IonToolbar, IonTitle,  IonButtons, IonButton } from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';



@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf, IonHeader, IonToolbar, IonTitle,  IonButtons, IonButton],
  templateUrl: './header.component.html',
})
export class HeaderComponent  {
  public auth = inject(AuthService);
  private authUi = inject(AuthUiService);

  constructor(private router: Router) {
  }


  async login() {
    const success = await this.authUi.openLoginModal();
  }


  logout() {
    this.auth.logout();
    this.router.navigate(['login']);
  }
}
