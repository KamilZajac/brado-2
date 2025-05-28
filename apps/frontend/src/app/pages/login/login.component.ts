import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LoadingController, ToastController } from '@ionic/angular/standalone';
import { IonicModule} from '@ionic/angular';
import {AuthService} from "../../services/auth/auth.service";
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],

})
export class LoginComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', Validators.required],
    });
  }

  async login() {
    if (this.form.invalid) return;

    this.loading = true;
    const loading = await this.loadingCtrl.create({ message: 'Logowanie...' });
    await loading.present();

    try {
      const { username, password } = this.form.value;

      const token = await this.auth.login(username, password);

      console.log(token)
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Zalogowano!', duration: 1500, color: 'success' });
      await toast.present();

      this.router.navigate(['/']);
      // Redirect to app/dashboard
    } catch (err) {
      console.log('AJAJAJAJJ')
      await loading.dismiss();
      const toast = await this.toastCtrl.create({ message: 'Podane dane są nieprawidłowe!', duration: 4000, color: 'danger' });
      await toast.present();
    } finally {
      console.log('wrwrwrrw')
      this.loading = false;
    }
  }
}
