import Cocoa
import Foundation

// Passive global monitor: never consumes or modifies right clicks.
let monitor = NSEvent.addGlobalMonitorForEvents(matching: .rightMouseDown) { event in
    let p = NSEvent.mouseLocation
    let record: [String: Any] = ["x": p.x, "y": p.y, "timestamp": Date().timeIntervalSince1970]
    if let data = try? JSONSerialization.data(withJSONObject: record),
       let line = String(data: data, encoding: .utf8) {
        print(line)
        fflush(stdout)
    }
}
guard monitor != nil else {
    fputs("Unable to install global mouse monitor. Check macOS Input Monitoring permission.\n", stderr)
    exit(2)
}
RunLoop.main.run()
