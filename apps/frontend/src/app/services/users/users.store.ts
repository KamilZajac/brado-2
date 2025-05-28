import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import {UsersApiService} from "./users.service";
import {CreateUser, User} from "@brado/types";


@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly api = inject(UsersApiService);

  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly users: Signal<User[]> = computed(() => this._users());
  readonly loading: Signal<boolean> = computed(() => this._loading());
  readonly error: Signal<string | null> = computed(() => this._error());

  loadAll() {
    this._loading.set(true);
    this._error.set(null);

    this.api.getAll().subscribe({
      next: (users) => this._users.set(users),
      error: (err) => this._error.set('Failed to load users'),
      complete: () => this._loading.set(false)
    });
  }

  create(user: CreateUser) {
    this._loading.set(true);
    this.api.create(user).subscribe({
      next: (newUser) => this._users.update(users => [...users, newUser]),
      error: (err) => this._error.set('Failed to create user'),
      complete: () => this._loading.set(false)
    });
  }

  update(id: number, updates: Partial<User>) {
    this._loading.set(true);
    this.api.update(id, updates).subscribe({
      next: (updatedUser) => {
        this._users.update(users =>
          users.map(u => u.id === +id ? updatedUser : u)
        );
      },
      error: () => this._error.set('Failed to update user'),
      complete: () => this._loading.set(false)
    });
  }

  delete(id: number) {
    this._loading.set(true);
    this.api.delete(id).subscribe({
      next: () => {
        this._users.update(users => users.filter(u => u.id !== +id));
      },
      error: () => this._error.set('Failed to delete user'),
      complete: () => this._loading.set(false)
    });
  }

  getById(id: number): User | undefined {
    return this._users().find(u => u.id === +id);
  }

  reset() {
    this._users.set([]);
    this._error.set(null);
    this._loading.set(false);
  }
}
