export function hash(s: string){
    let hash: number = 0;
    let chr: number;
    for (let i = 0; i < s.length; i++) {
      chr   = s.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function escapeHtml(unsafe: string): string {
  return unsafe
      .replace(/['"]+/g, '')
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

export function dateToString(date: Date): string{
  return `${twoDez(date.getDate())}.${twoDez(date.getMonth() + 1)}.${date.getFullYear()}, ${twoDez(date.getHours())}:${twoDez(date.getMinutes())}`;
}

export function dateToStringWithoutTime(date: Date): string{
  return `${twoDez(date.getDate())}.${twoDez(date.getMonth())}.${date.getFullYear()}`;
}

function twoDez(z: number):string {
  if(z < 10) return "0" + z;
  return "" + z;
}

export function stringToDate(text: string): Date {

  let match = text.match(/^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})$/);

  let date: Date = new Date(Number.parseInt(match[3]), Number.parseInt(match[2]), Number.parseInt(match[1]), Number.parseInt(match[4]), Number.parseInt(match[5]) );

  return date;
}

export function stringWrap(s: string, length: number ): string{
  return s.replace(
    new RegExp(`(?![^\\n]{1,${length}}$)([^\\n]{1,${length}})\\s`, 'g'), '$1\n'
  );
} 

export function formatAsJavadocComment(s: string, indent: number|string = ""): string {
  let indentString = "";

  if(typeof indent == "string"){
    indentString = indent;
  } else {
    for(let i = 0; i < indent; i++){
      indentString += " ";
    }
  }

  s = stringWrap(s, 60);
  if(s.length > 0) s = "\n" + s;
  s = indentString + "/**" + s.replace(/\n/g, "\n" + indentString + " * ") + "\n" + indentString + " */";
  return s;
}


export function isDate(inputText: string) {

      if (inputText == null || typeof inputText != 'string') return false;

      // var dateformat = /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/;
      var dateformat = /^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/;
      // Match the date format through regular expression
      if (inputText.match(dateformat)) {
          //Test which seperator is used '/' or '-'
          var opera1 = inputText.split('/');
          var opera2 = inputText.split('-');
          var lopera1 = opera1.length;
          var lopera2 = opera2.length;
          // Extract the string into month, date and year
          if (lopera1 > 1) {
              var pdate = inputText.split('/');
          }
          else if (lopera2 > 1) {
              var pdate = inputText.split('-');
          }
          if (pdate.length != 3) return false;
          var dd = parseInt(pdate[2]);
          var mm = parseInt(pdate[1]);
          var yy = parseInt(pdate[0]);
          // Create list of days of a month [assume there is no leap year by default]
          var ListofDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          if (mm == 1 || mm > 2) {
              if (dd > ListofDays[mm - 1]) {
                  return false;
              }
          }
          if (mm == 2) {
              var lyear = false;
              if ((!(yy % 4) && yy % 100) || !(yy % 400)) {
                  lyear = true;
              }
              if ((lyear == false) && (dd >= 29)) {
                  return false;
              }
              if ((lyear == true) && (dd > 29)) {
                  return false;
              }
              return true;
          }

          return true;

      }
      else {
          return false;
      }
  }

  export function isDateTime(inputText: string) {

      if (inputText == null || typeof inputText != 'string') return false;

      // var dateformat = /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/;
      var dateformat = /^\d{4}[\-](0[1-9]|1[012])[\-](0[1-9]|[12][0-9]|3[01]) ([01][0-9]|2[0123]):([0-5][0-9]):([0-5][0-9])$/;
      // Match the date format through regular expression
      if (inputText.match(dateformat)) {
          var splitStr = inputText.split(' ');
          var dateStr = splitStr[0];
          //var timeStr = splitStr[1];

          if (dateStr.length != 10) return false;
          var dd = parseInt(dateStr.substring(8,10));
          var mm = parseInt(dateStr.substring(5, 7));
          var yy = parseInt(dateStr.substring(0, 4));
          // Create list of days of a month [assume there is no leap year by default]
          var ListofDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          if (mm == 1 || mm > 2) {
              if (dd > ListofDays[mm - 1]) {
                  return false;
              }
          }
          if (mm == 2) {
              var lyear = false;
              if ((!(yy % 4) && yy % 100) || !(yy % 400)) {
                  lyear = true;
              }
              if ((lyear == false) && (dd >= 29)) {
                  return false;
              }
              if ((lyear == true) && (dd > 29)) {
                  return false;
              }
              return true;
          }

          return true;

      }
      else {
          return false;
      }
  }
  export function isTime(inputText: string) {

      if (inputText == null || typeof inputText != 'string') return false;

      var timeformat = /^([01][0-9]|2[0123]):([0-5][0-9]):([0-5][0-9])$/;
      // Match the date format through regular expression
      return inputText.match(timeformat) != null;
  }
