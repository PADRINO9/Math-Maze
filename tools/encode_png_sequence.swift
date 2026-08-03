#!/usr/bin/env swift

import Foundation
import AVFoundation
import AppKit
import CoreVideo

guard CommandLine.arguments.count >= 4 else {
    fputs("Usage: encode_png_sequence.swift <frames-dir> <output.mp4> <fps>\n", stderr)
    exit(2)
}

let fileManager = FileManager.default
let framesDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let fps = max(1, Int32(CommandLine.arguments[3]) ?? 30)
let frameURLs = try fileManager.contentsOfDirectory(
    at: framesDirectory,
    includingPropertiesForKeys: nil,
    options: [.skipsHiddenFiles]
).filter { $0.pathExtension.lowercased() == "png" }
 .sorted { $0.lastPathComponent < $1.lastPathComponent }

guard let firstURL = frameURLs.first,
      let firstImage = NSImage(contentsOf: firstURL) else {
    fputs("No readable PNG frames found\n", stderr)
    exit(3)
}

var firstRect = NSRect(origin: .zero, size: firstImage.size)
guard let firstCGImage = firstImage.cgImage(forProposedRect: &firstRect, context: nil, hints: nil) else {
    fputs("Unable to decode first PNG frame\n", stderr)
    exit(4)
}

let width = firstCGImage.width
let height = firstCGImage.height
try? fileManager.removeItem(at: outputURL)

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 2_400_000,
        AVVideoExpectedSourceFrameRateKey: fps,
        AVVideoMaxKeyFrameIntervalKey: fps
    ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
input.expectsMediaDataInRealTime = false
let pixelBufferAttributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: pixelBufferAttributes
)

guard writer.canAdd(input) else {
    fputs("Unable to add AVAssetWriter input\n", stderr)
    exit(5)
}
writer.add(input)
guard writer.startWriting() else {
    fputs("Unable to start video writer: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
    exit(6)
}
writer.startSession(atSourceTime: .zero)

func makePixelBuffer(from image: CGImage) throws -> CVPixelBuffer {
    var pixelBuffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pixelBuffer)
    guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
        throw NSError(domain: "KaflulVideo", code: Int(status), userInfo: [
            NSLocalizedDescriptionKey: "Unable to allocate video pixel buffer"
        ])
    }

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let baseAddress = CVPixelBufferGetBaseAddress(buffer) else {
        throw NSError(domain: "KaflulVideo", code: 7, userInfo: [
            NSLocalizedDescriptionKey: "Pixel buffer has no base address"
        ])
    }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
    let bitmapInfo = CGBitmapInfo.byteOrder32Little.rawValue
        | CGImageAlphaInfo.premultipliedFirst.rawValue
    guard let context = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: bitmapInfo
    ) else {
        throw NSError(domain: "KaflulVideo", code: 8, userInfo: [
            NSLocalizedDescriptionKey: "Unable to create video frame context"
        ])
    }
    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return buffer
}

for (index, frameURL) in frameURLs.enumerated() {
    guard let image = NSImage(contentsOf: frameURL) else {
        throw NSError(domain: "KaflulVideo", code: 9, userInfo: [
            NSLocalizedDescriptionKey: "Unable to decode \(frameURL.lastPathComponent)"
        ])
    }
    var rect = NSRect(origin: .zero, size: image.size)
    guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
        throw NSError(domain: "KaflulVideo", code: 10, userInfo: [
            NSLocalizedDescriptionKey: "Unable to create CGImage for \(frameURL.lastPathComponent)"
        ])
    }
    while !input.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.001)
    }
    let pixelBuffer = try makePixelBuffer(from: cgImage)
    let presentationTime = CMTime(value: CMTimeValue(index), timescale: fps)
    guard adaptor.append(pixelBuffer, withPresentationTime: presentationTime) else {
        throw NSError(domain: "KaflulVideo", code: 11, userInfo: [
            NSLocalizedDescriptionKey: "Unable to append frame \(index): \(writer.error?.localizedDescription ?? "unknown error")"
        ])
    }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting { semaphore.signal() }
semaphore.wait()

guard writer.status == .completed else {
    fputs("Video writer failed: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
    exit(12)
}

let duration = Double(frameURLs.count) / Double(fps)
print("{\"frames\":\(frameURLs.count),\"fps\":\(fps),\"duration\":\(String(format: "%.3f", duration)),\"width\":\(width),\"height\":\(height)}")
