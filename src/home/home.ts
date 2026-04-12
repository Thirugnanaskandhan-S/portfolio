import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // 1. Add this import

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink], // 2. Add it here
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}