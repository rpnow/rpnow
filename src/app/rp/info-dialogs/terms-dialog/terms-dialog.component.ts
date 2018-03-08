
import { Component } from '@angular/core';
import * as marked from 'marked';
import { MatDialogRef } from '@angular/material/dialog';

const template = marked(`
By using RPNow, you agree to the terms listed in this document.

#### Definitions

*   "We" or "our" refers to the administrator(s) of this site.
*   "You" refers to everyone who uses this site.
*   "This site" refers to the website on which the RPNow service his hosted.
*   "RPNow" refers to the service itself.
*   "RP's" or "roleplays" refers to the stories and their characters that are written on this site.
*   "Consent" refers to explicit permission given in written or typed form.

#### Terms of Use

RPNow is a service we provide free of charge. As such, we ask that you follow a few rules.

*   Do not use this service to harrass others in any way.
*   Do not engage in, promote, encourage, or otherwise involve yourselves in illegal activity through this website.
*   Do not use this site if you are under 13 years old.

Failure to follow these guidelines may result in roleplays being deleted without notice. If necessary, the appropriate authorities will be contacted.

#### Your Rights

We understand that as you write stories and develop characters on our website, there's a certain amount of trust you must place in us. We recognize that your original work belongs to you. We will not steal your original characters, stories, or any other original work. We won't try to sell or publish your works. We won't even display them in a public place without your consent.

#### Privacy

RPNow is inherently anonymous. The only personal information that we have access to is whatever you type into the chat, and the IP address through which you visit and use the site.

We will not disclose any of this information to any third parties. We may, however, use this information for our own internal purposes; that is, we might skim over your RP's. We want to undertsand how people are using this site, so that we can improve it to better suit your needs. We also must moderate the content on our site, to ensure the service is not used for any illegal or otherwise undesirable activity. We may also generate statistical information which we may display publicly; however, no publicly available statistics will include specific content from individual roleplays unless we first get your consent.

We have taken multiple precautions to ensure that your data is secure, such as using SSL encryption and being very careful to prevent common web service attacks. However, if we become aware of a data breach, we will let you know within 48 hours. Because we do not collect e-mail addresses, we will announce it on the front page of the site, as well as on the individual RP pages.

#### Warranty

This site and the RPNow service are provided "as is" without warranty of any kind, either express or implied, including without limitation any implied warranties of condition, uninterrupted use, merchantability, fitness for a particular purpose, or non-infringement.

`);

@Component({
  templateUrl: 'terms-dialog.html',
  styles: []
})
export class TermsDialogComponent {

  public innerHtml: string = template;

  constructor(
    private dialogRef: MatDialogRef<TermsDialogComponent>
  ) {}

  close() {
    this.dialogRef.close();
  }
}
