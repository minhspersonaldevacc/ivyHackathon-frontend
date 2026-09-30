declare module 'occt-import-js' {
  export interface OcctMesh {
    color?: number[]
    name?: string
    attributes: {
      position: { array: number[] }
      normal?: { array: number[] }
    }
    index: { array: number[] }
  }

  export interface OcctResult {
    success: boolean
    meshes: OcctMesh[]
  }

  export interface OcctImporter {
    ReadStepFile(content: Uint8Array, params: null): OcctResult
    ReadIgesFile(content: Uint8Array, params: null): OcctResult
  }

  export default function occtImportJs(options?: {
    locateFile?: (path: string) => string
  }): Promise<OcctImporter>
}
