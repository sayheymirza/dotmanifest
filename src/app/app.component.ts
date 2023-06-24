import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
//
import pica from 'pica';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

// package.json
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  host: {
    class: 'grid md:grid-cols-2 gap-10 h-full container mx-auto px-4 py-20'
  }
})
export class AppComponent {
  public Package: any = packageJson;

  public Tab: number = 1;
  public Preview: number = 0;

  // manifest.json file form group
  public FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    short_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    start_url: new FormControl('./', [Validators.required]),
    display: new FormControl('standalone', [Validators.required]),
    background_color: new FormControl('#ffffff', [Validators.required]),
    theme_color: new FormControl('#ffffff', [Validators.required]),
    icons: new FormControl<any[]>([], [Validators.required]),
  });

  public Errors: string[] = [];

  public get ManifestJSON(): string {
    return JSON.stringify(this.FormGroup.value, null, 2);
  }

  public get ManifestFileTree(): string {
    if (this.file) {
      return `./
 └── manifest.json
 └── icons
${this.ManifestIconSizes.map((size) => `\t└── icon-${size}.png`).join('\n')
        } `;
    }

    return `./
 └── manifest.json`;
  }

  public ManifestIconSizes: string[] = [
    '72x72',
    '96x96',
    '128x128',
    '144x144',
    '152x152',
    '192x192',
    '348x348',
    '512x512'
  ];

  public ManifestIcon: string = './assets/images/application.png';

  public GeneratedManifestIconsBySize: any = {};

  public Previews: any[] = [
    {
      title: 'Install',
      subtitle: 'Your web app icon on install'
    },
    {
      title: 'Home Screen',
      subtitle: 'Your web app icon on home screen'
    },
    {
      title: 'Splash Screen',
      subtitle: 'Your web app icon on splash screen'
    },
  ]

  private file?: File;

  public OnPickIcon(event: any): void {
    const files = event.target.files;
    if (files.length == 1) {
      this.file = files[0];
      this.ManifestIcon = URL.createObjectURL(files[0]);

      // generate icons from sizes
      const icons = this.ManifestIconSizes.map((size) => {
        const [width, height] = size.split('x');
        return {
          src: `icons/icon-${size}.png`,
          sizes: `${width}x${height}`,
          type: 'image/png'
        }
      });

      // update form group
      this.FormGroup.patchValue({
        icons: icons
      });
    }
  }

  public Submit() {
    this.FormGroup.markAllAsTouched();

    this.Errors = [];
    if (this.FormGroup.invalid) {
      this.Errors = Object.keys(this.FormGroup.controls).map((key) => {
        const control = this.FormGroup.get(key);
        return control?.invalid ? key : '';
      }).filter((key) => key !== '');
      console.log(this.Errors);

      return;
    }

    const zip = new JSZip();

    zip.file('manifest.json', this.ManifestJSON);

    if (this.file) {
      const p = pica();

      const promises = this.ManifestIconSizes.map((size) => {
        return new Promise<void>((resolve, reject) => {
          const [width, height] = size.split('x');

          const canvas = document.createElement('canvas');

          canvas.width = parseInt(width);
          canvas.height = parseInt(height);

          const image = new Image();
          image.src = URL.createObjectURL(this.file!);
          image.onload = () => {
            p.resize(image, canvas, {
              unsharpAmount: 80,
              unsharpRadius: 0.6,
              unsharpThreshold: 2
            }).then((result) => {
              result.toBlob((blob) => {
                this.GeneratedManifestIconsBySize[size] = URL.createObjectURL(blob!);
                zip.file(`icons/icon-${size}.png`, blob!);
                resolve();
              }, 'image/png');
            });
          }
        });
      });

      Promise.all(promises).then(() => {
        zip.generateAsync({ type: 'blob' }).then((content) => {
          FileSaver.saveAs(content, `${this.FormGroup.get('short_name')!.value}.zip`);
        });
      }).catch(console.error)
    }
  }
}
