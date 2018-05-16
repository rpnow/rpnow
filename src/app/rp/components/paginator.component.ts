import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';

@Component({
    selector: 'rpn-paginator',
    template: `
        <div id="pager" fxLayout="row" fxLayoutAlign="center center">

            <button mat-icon-button [disabled]="isFirstPage" (click)="changePage(1)">
                <mat-icon aria-label="First page" matTooltip="First page">first_page</mat-icon>
            </button>

            <button mat-icon-button [disabled]="isFirstPage" (click)="changePage(pageNum-1)">
                <mat-icon aria-label="Previous page" matTooltip="Previous page">navigate_before</mat-icon>
            </button>

            Page {{ pageNum }}

            <button mat-icon-button [disabled]="isLastPage" (click)="changePage(pageNum+1)">
                <mat-icon aria-label="Next page" matTooltip="Next page">navigate_next</mat-icon>
            </button>

            <button mat-icon-button [disabled]="isLastPage" (click)="changePage(pageCount)">
                <mat-icon aria-label="Last page" matTooltip="Last page">last_page</mat-icon>
            </button>
        </div>
    `,
    styles: [`
        #pager {
            background-color: #eee;
        }
        :host-context(.dark-theme) #pager {
            background-color: #555;
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginatorComponent {

    @Input() pageNum: number;

    @Output() readonly pageNumChange: EventEmitter<number> = new EventEmitter();

    @Input() pageCount: number;

    get isFirstPage() {
        return this.pageNum === 1;
    }

    get isLastPage() {
        return this.pageNum >= this.pageCount;
    }

    changePage(pageNum: number) {
        this.pageNumChange.emit(pageNum);
    }

}

