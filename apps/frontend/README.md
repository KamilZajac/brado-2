# Angular Material Installation

To use the Material Table in the readings-table component, you need to install Angular Material and its dependencies:

```bash
# Install Angular Material
npm install @angular/material --save

# Install Angular CDK (Component Dev Kit)
npm install @angular/cdk --save

# Install Angular Animations (required by Material)
npm install @angular/animations --save
```

## Material Theme

You also need to include a Material theme in your project. Add one of the pre-built themes to your `styles.scss` file:

```scss
@import '@angular/material/prebuilt-themes/indigo-pink.css';
```

Or for a custom theme, follow the [Angular Material theming guide](https://material.angular.io/guide/theming).

## Material Icons

If you want to use Material Icons, add the following to your `index.html` file:

```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

## Browser Animations

Import BrowserAnimationsModule in your app.module.ts or main.ts file:

```typescript
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// For standalone components in main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    // other providers...
  ],
});

// OR for NgModule in app.module.ts
@NgModule({
  imports: [
    BrowserAnimationsModule,
    // other imports...
  ],
})
```
