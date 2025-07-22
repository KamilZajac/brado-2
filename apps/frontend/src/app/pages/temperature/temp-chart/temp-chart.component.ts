import {Component, inject, Inject, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {TemperatureStore} from "../../../services/temperature/temp.store";
import {ChartComponent} from "../../../components/chart/chart.component";
import {IonContent} from "@ionic/angular/standalone";
import {TempService} from "../../../services/temperature/temp.service";
import {getStartOfToday} from "../../../services/data/data.service";

@Component({
  selector: 'app-temp-chart',
  templateUrl: './temp-chart.component.html',
  styleUrls: ['./temp-chart.component.scss'],
  imports: [
    ChartComponent,
    IonContent,
    RouterLink
  ]
})
export class TempChartComponent  implements OnInit {

  tempStore = inject(TemperatureStore);
  tempID: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tempService: TempService
  ) {}

  ngOnInit(): void {
    this.tempID = this.route.snapshot.paramMap.get('id');
  }
  goBack() {
    if (window.history.length > 1) {
      window.history.back(); // Native browser back
    } else {
      this.router.navigateByUrl('/dashboard'); // Fallback
    }
  }

  exportTempToExcel() {
    if(!this.tempID) {
      return
    }
    this.tempService.exportToExcel(this.tempID).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.tempID}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
