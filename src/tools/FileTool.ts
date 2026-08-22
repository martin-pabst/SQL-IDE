export class FileTool {
    static zipSignature: number[] = [0x78, 0x9c];
    static sqLiteSignature: number[] = [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33, 0x00];

    static isZipfile(fileData: Uint8Array): boolean {

        return FileTool.checkSignature(fileData, this.zipSignature);

    }

    static isSqLiteFile(fileData: Uint8Array): boolean {

        return FileTool.checkSignature(fileData, this.sqLiteSignature);

    }

    static checkSignature(fileData: Uint8Array, signature: number[]): boolean {

        if(fileData == null) return false;
        if(fileData.byteLength < signature.length) return false;
        
        for(let i = 0; i < signature.length; i++){
            if(fileData[i] != signature[i]) return false;
        }

        return true;
    }

}