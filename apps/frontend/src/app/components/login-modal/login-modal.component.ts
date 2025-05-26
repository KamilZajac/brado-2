import { Component } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import {AuthService} from "../../services/auth/auth.service";
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonLabel,IonInput } from '@ionic/angular/standalone';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-text-input-modal',
  templateUrl: './login-modal.component.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, ReactiveFormsModule, IonLabel,IonInput],
  providers: [ModalController]}
)
export class LoginModalComponent {
  loading = false;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  async login() {
    if (this.form.invalid) return;
    this.loading = true;
    try {
      const { username, password } = this.form.value;
      const token = await this.auth.login(username, password);
      await this.toast('Zalogowano pomyślnie');
      this.modalCtrl.dismiss({ token }, 'success');
    } catch {
      await this.toast('Nieprawidłowy login lub hasło');
    } finally {
      this.loading = false;
    }
  }
  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  private async toast(message: string) {
      this.toastCtrl.create({ message, duration: 2000 }).then(t => t.present());
  }
}
