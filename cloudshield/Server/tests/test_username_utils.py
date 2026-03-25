from cloudshield.Server.utils.usernames import derive_username


def test_derive_username_uses_first_initial_and_last_name():
    assert derive_username("Jake Edwards") == "j_edwards"
    assert derive_username("James John") == "j_john"
    assert derive_username("John Michael Doe") == "j_doe"


def test_derive_username_normalizes_and_truncates_to_dc_limit():
    assert derive_username("Elodie O'Connor") == "e_oconnor"
    assert derive_username("A Maximilianus Supercalifragilistic") == "a_supercalifragilist"


def test_derive_username_single_name_and_empty_input():
    assert derive_username("Madonna") == "madonna"
    assert derive_username("   ") == ""
