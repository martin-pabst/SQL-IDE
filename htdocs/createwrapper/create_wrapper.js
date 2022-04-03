window.onload=init;

var includesciptsrc="https://embed.learn-sql.de/include/js/includeide/includeIDE.js"
var includesciptsrcOfficial="https://embed.learn-sql.de/include/js/includeide/includeIDE.js"
let url = getCookie("url");
    if(url){
        includesciptsrc = url;
    }
var authorel =  null;

var filenames = [];
var filedata = [];
var filetypes = []; // j=javacode , t=tipp

var tabCounter = 1;
var selectedTab = "code_1"


function init()
{
    document.getElementById("Code").addEventListener("change",updateIframe);
    document.getElementById("update").addEventListener("click",updateIframe);
    document.getElementById("Id").addEventListener("change",updateIframe);
    document.getElementById("url").addEventListener("change",
    function (){
        includesciptsrc = document.getElementById("url").value;
        setCookie("url", includesciptsrc, 1000);
        updateIframe();
    });
    document.getElementById("dburl").addEventListener("change",
    function (){
        includesciptsrc = document.getElementById("dburl").value;
        setCookie("dburl", includesciptsrc, 1000);
        updateIframe();
    });
    document.getElementById("url").value = includesciptsrc;
    document.getElementById("Width").addEventListener("change",updateIframe);
    document.getElementById("Height").addEventListener("change",updateIframe);
    document.getElementById("copyclipboard").addEventListener("click",copyClipboard);
    document.getElementById("button_video").addEventListener("click",showVideo);
    // document.getElementById("addcode").addEventListener("click",addFile);
    authorel=document.getElementById("authornote");
    document.getElementById("code_1").onclick=selectTab;
    document.getElementById("code_1").onmouseenter=hoverTab;
    document.getElementById("code_1").onmouseleave=leaveTab;
    
    filenames["code_1"]="Statements.sql";
    filedata["code_1"]="";
    filetypes["code_1"]="j";
    document.getElementById("codefilename").addEventListener("input",saveCode);
    document.getElementById("codefilename").addEventListener("change",updateIframe);
    document.getElementById("Code").addEventListener("input",saveCode);
    // document.getElementById("codetypejava").addEventListener("change",saveCode);
    // document.getElementById("codetypetipp").addEventListener("change",saveCode);
    // document.getElementById("deletecode").addEventListener("click",removeCurrentTab);

    updateIframe(); 
    updateCurrentTab();

    
}

function updateIframe()
{
    let width=document.getElementById("Width").value;
    let height=document.getElementById("Height").value;
    let id=document.getElementById("Id").value;
    let javacode=document.getElementById("Code").value;
    let dburl=document.getElementById("dburl").value;
    
    
    //speed = Math.ceil(Math.exp(speed*0.138155));

    let ifcode="<iframe srcdoc=\"<script>window.jo_doc = window.frameElement.textContent;</script><script src='$url$'></script>\" width=\"" 
                + width + "\" height=\"" + height + "\" frameborder=\"0\">\n" +
                "{'id': '" + id + "', " +
                "'databaseURL': '" +  dburl + "'" + 
                "}\n";
    
    let parent = document.getElementById("codetab");
    for(let i=0;i<parent.children.length-1;i++)
    {
        let c=parent.children[i].id;
        ifcode = ifcode + '<script  type="plain/text" title="' + filenames[c]+'"';
        if(filetypes[c]!="j")
        {
            ifcode = ifcode + ' data-type="hint"';
        }
        ifcode = ifcode + '>\n';
        ifcode = ifcode + filedata[c] + "</script>\n";
    }
    ifcode=ifcode + "</iframe>";

    ifcodeOutput = ifcode.replace("$url$", includesciptsrc);
    ifcode = ifcode.replace("$url$", includesciptsrcOfficial);


    console.log(ifcode);
    document.getElementById("uristring").innerText=ifcodeOutput;
    let iframe = document.getElementById("if");
    document.body.removeChild(iframe);
    document.body.removeChild(authorel);
    let ifelement = htmlToElement(ifcode);
    ifelement.id="if";
    document.body.appendChild(ifelement);
    document.body.appendChild(authorel);
}

function copyClipboard()
{
    updateIframe();
    var el=document.createElement("textarea");
    el.value=document.getElementById("uristring").innerText;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("HTML Code wurde in die Zwischenablage kopiert."); 
}

function showVideo()
{
    let but=document.getElementById("button_video");
    but.style.display="none";
    let video=document.getElementById("video");
    video.style.display="inline";
    video.play();
}

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function addFile(){
    saveCode()
    tabCounter++;
    let newTabButton = document.createElement("button");
    newTabButton.id="code_" + tabCounter;
    newTabButton.innerHTML="Statements" + tabCounter + ".sql";
    newTabButton.onclick=selectTab;
    newTabButton.onmouseenter=hoverTab;
    newTabButton.onmouseleave=leaveTab;
    let addTabButton = document.getElementById("addcode");
    addTabButton.parentElement.insertBefore(newTabButton,addTabButton);    
    filenames[newTabButton.id]="Statements" + tabCounter + ".sql";
    filedata[newTabButton.id]="";
    filetypes[newTabButton.id]="j";
    selectedTab=newTabButton.id;
    updateIframe();
    selectTab(null);
}

function updateCurrentTab()
{
    selectTab(null);
}

function selectTab(event){
    var tabElement=null;
    if(event!=null)
        tabElement = event.target;
    else
        tabElement = document.getElementById(selectedTab);
    selectedTab = tabElement.id;
    highlightSelectedTab();
    document.getElementById("codefilename").value=filenames[selectedTab];
    document.getElementById("Code").value=filedata[selectedTab];
    // if(filetypes[selectedTab]=="j")
    // {
    //     document.getElementById("codetypetipp").checked=false;
    //     document.getElementById("codetypejava").checked=true;
    // } 
    // else
    // {
    //     document.getElementById("codetypejava").checked=false;
    //     document.getElementById("codetypetipp").checked=true;   
    // }
}
 
function saveCode()
{
    console.log("Saving tab " + selectedTab);
    filenames[selectedTab]=document.getElementById("codefilename").value;
    filedata[selectedTab]=document.getElementById("Code").value;
    console.log(filedata[selectedTab]);
    // if(document.getElementById("codetypejava").checked)
    //     filetypes[selectedTab]="j";
    // else
    //     filetypes[selectedTab]="t";
    document.getElementById(selectedTab).innerHTML=filenames[selectedTab];
    if(document.activeElement.id!="Code" &&
        document.activeElement.id!="codefilename"
    )
    updateIframe();
}

function removeCurrentTab()
{
    let parent = document.getElementById("codetab");
    if(parent.children.length<3)
    {
        alert("Man benötigt mindestens eine (möglicherweise auch leere) Datei.");
        return;
    }
    delete filenames[selectedTab];
    delete filedata[selectedTab];
    delete filetypes[selectedTab];
    parent.removeChild(document.getElementById(selectedTab));
    selectedTab=parent.children[0].id;
    selectTab(null);
    updateIframe();
}

function highlightSelectedTab()
{
    let parent = document.getElementById("codetab");
    for(let i=0;i<parent.children.length;i++)
    {
        if(parent.children[i].id==selectedTab){
            parent.children[i].style.backgroundColor="#FFCCE5";
        }
        else
        {
            parent.children[i].style.backgroundColor="#f1f1f1";
        }
    }
}

function hoverTab(event)
{
    if(event.target.id!=selectedTab)
    {
        event.target.style.backgroundColor="rgb(200,200,200)";
    }
}

function leaveTab(event)
{
    if(event.target.id!=selectedTab)
    {
        event.target.style.backgroundColor="#f1f1f1";
    }
}


function getCookie(cName) {
    const name = cName + "=";
    const cDecoded = decodeURIComponent(document.cookie); //to be careful
    const cArr = cDecoded.split('; ');
    let res;
    cArr.forEach(val => {
      if (val.indexOf(name) === 0) res = val.substring(name.length);
    })
    return res
  }

  function setCookie(cName, cValue, expDays) {
    let date = new Date();
    date.setTime(date.getTime() + (expDays * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = cName + "=" + cValue + "; " + expires + "; path=/";
}
