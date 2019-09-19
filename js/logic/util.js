export function shuffleList(l)
{
    for (let i = 0; i < l.length-1; i++)
    {
        // Based on https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#Implementation_errors
        let switchIndex = i + Math.floor(Math.random() * (l.length - i));
        let tmp = l[switchIndex];
        l[switchIndex] = l[i];
        l[i] = tmp;
    }
}

export function toggleClass(element, className, enableClass)
{
    if (enableClass)
    {
        element.classList.add(className);
    }
    else
    {
        element.classList.remove(className);
    }
}

export function removeChild(myNode)
{
    while (myNode.firstChild)
    {
        myNode.removeChild(myNode.firstChild);
    }
}

export function createInput(type, name, value, text)
{
    let input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.value = value;

    let textnode = document.createTextNode(text);

    let label = document.createElement("label");
    label.appendChild(input);
    label.appendChild(textnode);

    return {'root': label, 'input': input};
}

export function createButton(type, id, value)
{
    let button = document.createElement("input");
    button.type = type;
    button.id = id;
    button.value = value;

    return button;
}

export function dictValues(dict)
{
    let values = [];
    for (let key in dict) {
        values.push(dict[key]);
    }

    return values;
}

export function concatArrays(arrays)
{
    return Array.prototype.concat.apply([], arrays);
}

export function isChecked(input)
{
    return (('checked' in input) ? input.checked : false);
}

export function inputValue(input)
{
    return (('value' in input) ? input.value : '');
}

export function removeEmptyStrings(array)
{
    return array.filter(Boolean);
}

export function writeToStorage(name, value) {
    try { localStorage.setItem(name, value); } catch (e) { console.error('Local storage is required'); return; }
    console.log("Wrote " + name + " to local storage, with value: " + value);
    // console.info("Local storage write:", name, value);
}

export function getFromStorage(name) {
    try { return localStorage.getItem(name); } catch (e) { console.error('Local storage is required'); return; }
}

export function findInDiscard(discard, id) {
    for (let i=0; i < discard.length; i++) {
        if (discard[i].id === id) {
            return discard[i];
        }
    }
    return null;
}
