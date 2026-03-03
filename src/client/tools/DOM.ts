export class DOM {

    public static clear(element: HTMLElement) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        element.textContent = '';
    }

    public static clearAllButGivenClasses(element: HTMLElement, ...classes: string[]) {
        let elementsToPreserve: HTMLElement[] = [];

        let e: HTMLElement;
        while (e = <HTMLElement>element.firstChild) {

            for (let s of classes) {
                if (e.classList.contains(s)) {
                    elementsToPreserve.push(e);
                    break;
                }
            }

            element.removeChild(e);
        }
        element.textContent = '';

        elementsToPreserve.forEach(e => element.appendChild(e));
    }

    public static makeDiv(parent: HTMLElement | undefined, ...classes: (string|undefined)[]): HTMLDivElement {
        let div = document.createElement('div');
        if (classes != null) div.classList.add(...classes.filter(c => c != null));
        if (parent) parent.appendChild(div);
        return div;
    }

    public static makeElement(parent: HTMLElement | undefined, type: string, ...classes: string[]): HTMLElement {
        let div = document.createElement(type);
        if (classes != null) div.classList.add(...classes);
        if (parent) parent.appendChild(div);
        return div;
    }

    public static makeSpan(parent: HTMLElement, ...classes: string[]): HTMLSpanElement {
        let span = document.createElement('span');
        if (classes != null) span.classList.add(...classes);
        parent.appendChild(span);
        return span;
    }



}