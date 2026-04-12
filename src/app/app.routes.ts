import { Routes } from '@angular/router';
import { Desktop } from '../desktop/desktop';
import { Home } from '../home/home';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'desktop', component: Desktop }
];
