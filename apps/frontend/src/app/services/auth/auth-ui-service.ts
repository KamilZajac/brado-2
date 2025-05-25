import { Injectable } from "@angular/core";
import {LoginModalComponent} from "../../components/login-modal/login-modal.component";
import { ModalController } from "@ionic/angular/standalone";

@Injectable({ providedIn: 'root' })
export class AuthUiService {
  private loginInProgress = false;

  constructor(private modalCtrl: ModalController) {}

  async openLoginModal(): Promise<boolean> {
    if (this.loginInProgress) return false;
    this.loginInProgress = true;

    const modal = await this.modalCtrl.create({
      component: LoginModalComponent,
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    this.loginInProgress = false;

    return role === 'success' && !!data?.token;
  }
}
