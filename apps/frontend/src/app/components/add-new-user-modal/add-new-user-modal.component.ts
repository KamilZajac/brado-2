import { Component } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-user-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Add User</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <ion-item>
          <ion-label position="floating">Imie</ion-label>
          <ion-input formControlName="username" type="email" required></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="floating">Hasło</ion-label>
          <ion-input formControlName="password" type="password" required></ion-input>
        </ion-item>

        <ion-item>
          <ion-label>Uprawnienia</ion-label>
          <ion-select formControlName="role" interface="popover">
            <ion-select-option value="superadmin">Superadmin</ion-select-option>
            <ion-select-option value="admin">Admin</ion-select-option>
            <ion-select-option value="worker">Worker</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-button expand="block" type="submit" [disabled]="form.invalid">Zapisz</ion-button>
      </form>
    </ion-content>
  `,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule],
})
export class AddUserModalComponent {
  form: FormGroup;

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', Validators.required],
      role: ['worker', Validators.required],
    });
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  submit() {
    if (this.form.valid) {
      this.modalCtrl.dismiss(this.form.value, 'confirm');
    }
  }
}
