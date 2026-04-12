'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings } from 'lucide-react';
import Hls from 'hls.js';

interface StreamPlayerProps {
  src: string; // Can be HLS (.m3u8) or direct video URL
  poster?: string;
  autoPlay?: boolean;
  isLive?: boolean;
  onViewerPing?: () => void;
  className?: string;
}

export function StreamPlayer({
  src,
  poster,
  autoPlay = true,
  isLive = false,
  onViewerPing,
  className = '',
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isHLS = src?.includes('.m3u8');

  // Initialize video source
  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;
    setError(null);
    setIsLoading(true);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHLS) {
      // HLS stream
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src;
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: isLive,
          backBufferLength: isLive ? 0 : 30,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError('Stream unavailable');
            setIsLoading(false);
          }
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(() => {
              // Autoplay blocked, will need user interaction
            });
          }
        });
        hlsRef.current = hls;
      } else {
        setError('HLS not supported in this browser');
        setIsLoading(false);
      }
    } else {
      // Direct video URL (MP4, MOV, WebM, etc.)
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, isHLS, isLive, autoPlay]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      if (video.duration && !isLive) {
        setProgress((video.currentTime / video.duration) * 100);
      }
      // Update buffered
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [isLive]);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const timeout = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Viewer ping interval
  useEffect(() => {
    if (!onViewerPing || !isPlaying) return;
    onViewerPing();
    const interval = setInterval(onViewerPing, 30000);
    return () => clearInterval(interval);
  }, [onViewerPing, isPlaying]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasUserInteracted(true);

    if (isPlaying) {
      video.pause();
    } else {
      // Try to unmute and play with sound on user interaction
      if (!hasUserInteracted) {
        video.muted = false;
        setIsMuted(false);
      }
      video.play().catch(() => {
        // If play fails (autoplay policy), try muted
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {
          setError('Unable to play video');
        });
      });
    }
  }, [isPlaying, hasUserInteracted]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    setHasUserInteracted(true);

    if (isMuted) {
      video.muted = false;
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    video.volume = newVolume;

    if (newVolume > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else if (newVolume === 0) {
      setIsMuted(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLive) return;
    e.stopPropagation();
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !bar) return;

    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const toggleFullscreen = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={togglePlay}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        background: '#000',
        borderRadius: isFullscreen ? 0 : 'var(--card-radius)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        webkit-playsinline="true"
        muted={isMuted}
        preload="metadata"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            className="loading-pulse"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
            }}
          />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.8)',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 32px rgba(239, 68, 68, 0.6)',
              transition: 'transform 0.2s ease',
            }}
          >
            <Play size={32} color="#fff" fill="#fff" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      )}

      {/* Tap for sound indicator */}
      {isPlaying && isMuted && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.6rem 0.9rem',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          <VolumeX size={16} />
          Tap for sound
        </button>
      )}

      {/* Live badge */}
      {isLive && isPlaying && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(239, 68, 68, 0.9)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            animation: 'pulse-glow 2s infinite',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              background: '#fff',
              borderRadius: '50%',
            }}
          />
          <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            LIVE
          </span>
        </div>
      )}

      {/* Controls overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          paddingTop: '3rem',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
          opacity: showControls || !isPlaying ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls || !isPlaying ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar (hidden for live) */}
        {!isLive && (
          <div
            onClick={handleProgressClick}
            style={{
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              cursor: 'pointer',
              marginBottom: '0.75rem',
              position: 'relative',
            }}
          >
            {/* Buffered */}
            <div
              style={{
                position: 'absolute',
                height: '100%',
                width: `${buffered}%`,
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '2px',
              }}
            />
            {/* Progress */}
            <div
              style={{
                position: 'absolute',
                height: '100%',
                width: `${progress}%`,
                background: 'var(--crimson-500)',
                borderRadius: '2px',
                transition: 'width 0.1s linear',
              }}
            />
            {/* Scrubber */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: `${progress}%`,
                transform: 'translate(-50%, -50%)',
                width: '12px',
                height: '12px',
                background: '#fff',
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                opacity: showControls ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
            />
          </div>
        )}

        {/* Control buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPlaying ? (
              <Pause size={22} color="#fff" />
            ) : (
              <Play size={22} color="#fff" fill="#fff" />
            )}
          </button>

          {/* Volume control group */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <button
              onClick={toggleMute}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} color="#fff" />
              ) : (
                <Volume2 size={18} color="#fff" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '60px',
                height: '4px',
                appearance: 'none',
                background: `linear-gradient(to right, var(--crimson-500) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Time display (not for live) */}
          {!isLive && (
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                flex: 1,
              }}
            >
              {formatTime((progress / 100) * duration)} / {formatTime(duration)}
            </span>
          )}

          {isLive && (
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.75rem',
                flex: 1,
              }}
            >
              Live
            </span>
          )}

          <button
            onClick={toggleFullscreen}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isFullscreen ? (
              <Minimize size={18} color="#fff" />
            ) : (
              <Maximize size={18} color="#fff" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
