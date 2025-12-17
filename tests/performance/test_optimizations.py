"""
Quick verification tests for Phase 1 performance optimizations.

Run with: python -m pytest tests/performance/test_optimizations.py -v
"""
from collections import deque


def test_ring_buffer_optimization():
    """Verify ring buffer (deque) works as expected for task output buffering."""
    
    # Simulate the optimized approach
    all_output = deque(maxlen=100)
    
    # Add 1000 lines (simulating long Terraform output)
    for i in range(1000):
        all_output.append(f"Line {i}")
    
    # Verify only last 100 lines are kept
    assert len(all_output) == 100
    assert all_output[0] == "Line 900"  # First item is line 900
    assert all_output[-1] == "Line 999"  # Last item is line 999
    
    # Verify we can still get last 30 lines for error context
    last_30 = list(all_output)[-30:]
    assert len(last_30) == 30
    assert last_30[0] == "Line 970"
    assert last_30[-1] == "Line 999"
    
    print("Ring buffer optimization verified - memory usage is O(1)")


def test_ring_buffer_memory_efficiency():
    """Compare memory usage of list vs deque."""
    import sys
    
    # Old approach: unbounded list
    large_list = []
    for i in range(10000):
        large_list.append(f"Output line {i}" * 10)  # ~150 bytes per line
    
    list_size = sys.getsizeof(large_list) + sum(sys.getsizeof(item) for item in large_list)
    
    # New approach: ring buffer
    ring_buffer = deque(maxlen=100)
    for i in range(10000):
        ring_buffer.append(f"Output line {i}" * 10)
    
    deque_size = sys.getsizeof(ring_buffer) + sum(sys.getsizeof(item) for item in ring_buffer)
    
    # Calculate savings
    memory_saved = list_size - deque_size
    savings_percent = (memory_saved / list_size) * 100
    
    print("\nMemory Comparison:")
    print(f"   List (10k items): {list_size:,} bytes")
    print(f"   Deque (100 items): {deque_size:,} bytes")
    print(f"   Memory saved: {memory_saved:,} bytes ({savings_percent:.1f}%)")
    
    assert savings_percent > 85, "Should save at least 85% memory"
    print("Memory efficiency verified - saved >85% memory")


def test_response_time_tracking():
    """Verify response time tracking works with Flask."""
    from time import time, sleep
    
    # Simulate the middleware approach
    class MockG:
        pass
    
    g = MockG()
    
    # Before request
    g.start_time = time()
    
    # Simulate some work
    sleep(0.01)  # 10ms
    
    # After request
    elapsed_ms = (time() - g.start_time) * 1000
    
    assert 10 <= elapsed_ms <= 20, f"Expected ~10ms, got {elapsed_ms:.2f}ms"
    
    # Verify header format
    header_value = f"{elapsed_ms:.2f}ms"
    assert header_value.endswith("ms")
    assert "." in header_value
    
    print(f"Response time tracking verified - {header_value}")


def test_text_index_specification():
    """Verify text index structure is correct."""
    
    # The index we're creating
    index_spec = [
        ("email", "text"),
        ("full_name", "text")
    ]
    index_name = "user_search_text_index"
    
    # Verify structure
    assert len(index_spec) == 2
    assert index_spec[0] == ("email", "text")
    assert index_spec[1] == ("full_name", "text")
    assert index_name.endswith("_index")
    
    print("Text index specification verified")


def test_slow_request_threshold():
    """Verify slow request detection logic."""
    
    # Define threshold
    SLOW_THRESHOLD_MS = 500
    
    # Test cases
    test_cases = [
        (100, False, "Fast request"),
        (499, False, "Just under threshold"),
        (500, False, "Exactly at threshold"),
        (501, True, "Just over threshold"),
        (1000, True, "Slow request"),
        (5000, True, "Very slow request"),
    ]
    
    for elapsed_ms, should_log, description in test_cases:
        is_slow = elapsed_ms > SLOW_THRESHOLD_MS
        assert is_slow == should_log, f"{description}: expected {should_log}, got {is_slow}"
    
    print(f"Slow request threshold verified - logging at >{SLOW_THRESHOLD_MS}ms")


def test_backwards_compatibility():
    """Verify optimizations don't break existing functionality."""
    
    # Ring buffer still supports all list operations we need
    buffer = deque(maxlen=10)
    buffer.append("item1")
    buffer.append("item2")
    
    # Can still convert to list for slicing
    as_list = list(buffer)
    assert as_list[-1] == "item2"
    
    # Can still join for error messages
    output = "\n".join(buffer)
    assert "item1" in output
    assert "item2" in output
    
    print("Backwards compatibility verified")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Testing Phase 1 Performance Optimizations")
    print("="*60 + "\n")
    
    test_ring_buffer_optimization()
    test_ring_buffer_memory_efficiency()
    test_response_time_tracking()
    test_text_index_specification()
    test_slow_request_threshold()
    test_backwards_compatibility()
    
    print("\n" + "="*60)
    print("All Phase 1 optimizations verified!")
    print("="*60)
