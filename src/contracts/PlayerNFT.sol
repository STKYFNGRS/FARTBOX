// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PlayerNFT
 * @dev Implementation of the Player NFT for Fart.box: Gas Dominance
 * Each token represents a player slot in the game with upgradeable traits
 */
contract PlayerNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Events
    event ExperienceGained(uint256 indexed tokenId, uint256 amount, uint256 newTotal);
    event LevelUp(uint256 indexed tokenId, uint256 newLevel);
    event WinRecorded(uint256 indexed tokenId, uint256 seasonId);
    event SeasonStarted(uint256 indexed seasonId, uint256 playerCount, bytes32 mapCID);
    event SeasonEnded(uint256 indexed seasonId, bytes32 resultsCID);

    // Player stats structure
    struct PlayerStats {
        uint256 experience;
        uint256 level;
        uint256 wins;
        // Add more stats as needed for gameplay
    }

    // Mapping from token ID to player stats
    mapping(uint256 => PlayerStats) private _stats;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Current season ID
    uint256 public currentSeason;
    
    // Max supply (optional, set to 0 for unlimited)
    uint256 public maxSupply;
    
    // Cost to mint a new player NFT (in wei)
    uint256 public mintPrice;
    
    // Experience required for each level (level 1 requires 0 XP)
    uint256 public constant XP_PER_LEVEL = 100;
    
    // Maximum players per map
    uint256 public maxPlayersPerMap;

    /**
     * @dev Constructor to initialize the contract
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param baseURI_ The base URI for token metadata
     * @param initialMaxSupply_ The maximum supply (0 for unlimited)
     * @param initialMintPrice_ The initial price to mint a token
     * @param initialMaxPlayersPerMap_ Maximum players per game map
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 initialMaxSupply_,
        uint256 initialMintPrice_,
        uint256 initialMaxPlayersPerMap_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
        maxSupply = initialMaxSupply_;
        mintPrice = initialMintPrice_;
        maxPlayersPerMap = initialMaxPlayersPerMap_;
        currentSeason = 0; // Season 0 means no active season
    }

    /**
     * @dev Check if a token exists
     * @param tokenId The ID of the token to check
     * @return bool Whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Mint a new player NFT
     * @return The token ID of the newly minted NFT
     */
    function mint() external payable returns (uint256) {
        // Check max supply if it's set
        if (maxSupply > 0) {
            require(totalSupply() < maxSupply, "Max supply reached");
        }
        
        // Check payment
        require(msg.value >= mintPrice, "Insufficient payment");
        
        // Mint the new token
        uint256 tokenId = totalSupply() + 1;
        _mint(msg.sender, tokenId);
        
        // Initialize player stats
        _stats[tokenId] = PlayerStats({
            experience: 0,
            level: 1,
            wins: 0
        });
        
        return tokenId;
    }

    /**
     * @dev Add experience to a token after a game
     * @param tokenId The ID of the token
     * @param amount The amount of experience to add
     * @notice Only callable by game master (owner)
     */
    function addExperience(uint256 tokenId, uint256 amount) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        
        // Add experience
        _stats[tokenId].experience += amount;
        
        // Check for level up
        uint256 newLevel = (_stats[tokenId].experience / XP_PER_LEVEL) + 1;
        if (newLevel > _stats[tokenId].level) {
            _stats[tokenId].level = newLevel;
            emit LevelUp(tokenId, newLevel);
        }
        
        emit ExperienceGained(tokenId, amount, _stats[tokenId].experience);
    }

    /**
     * @dev Record a win for a token
     * @param tokenId The ID of the token
     * @notice Only callable by game master (owner)
     */
    function recordWin(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(currentSeason > 0, "No active season");
        
        _stats[tokenId].wins += 1;
        
        emit WinRecorded(tokenId, currentSeason);
    }

    /**
     * @dev Batch update stats for multiple tokens after a game
     * @param tokenIds Array of token IDs
     * @param experienceAmounts Array of experience amounts to add
     * @param winners Array of booleans indicating if each token won
     * @notice Only callable by game master (owner)
     */
    function batchUpdateStats(
        uint256[] calldata tokenIds,
        uint256[] calldata experienceAmounts,
        bool[] calldata winners
    ) external onlyOwner {
        require(
            tokenIds.length == experienceAmounts.length && 
            tokenIds.length == winners.length,
            "Array lengths must match"
        );
        require(currentSeason > 0, "No active season");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(_exists(tokenId), "Token does not exist");
            
            // Add experience
            _stats[tokenId].experience += experienceAmounts[i];
            
            // Check for level up
            uint256 newLevel = (_stats[tokenId].experience / XP_PER_LEVEL) + 1;
            if (newLevel > _stats[tokenId].level) {
                _stats[tokenId].level = newLevel;
                emit LevelUp(tokenId, newLevel);
            }
            
            emit ExperienceGained(tokenId, experienceAmounts[i], _stats[tokenId].experience);
            
            // Record win if applicable
            if (winners[i]) {
                _stats[tokenId].wins += 1;
                emit WinRecorded(tokenId, currentSeason);
            }
        }
    }

    /**
     * @dev Start a new season
     * @param mapCID The IPFS CID of the map for this season
     * @notice Only callable by game master (owner)
     */
    function startSeason(bytes32 mapCID) external onlyOwner {
        currentSeason += 1;
        emit SeasonStarted(currentSeason, totalSupply(), mapCID);
    }

    /**
     * @dev End the current season
     * @param resultsCID The IPFS CID of the results for this season
     * @notice Only callable by game master (owner)
     */
    function endSeason(bytes32 resultsCID) external onlyOwner {
        require(currentSeason > 0, "No active season");
        emit SeasonEnded(currentSeason, resultsCID);
    }

    /**
     * @dev Get stats for a token
     * @param tokenId The ID of the token
     * @return The player stats
     */
    function getPlayerStats(uint256 tokenId) external view returns (PlayerStats memory) {
        require(_exists(tokenId), "Token does not exist");
        return _stats[tokenId];
    }

    /**
     * @dev Override base URI for token metadata
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Update the base URI
     * @param newBaseURI The new base URI
     * @notice Only callable by the owner
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    /**
     * @dev Update the mint price
     * @param newPrice The new mint price
     * @notice Only callable by the owner
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    /**
     * @dev Update the max players per map
     * @param newMaxPlayers The new max players per map
     * @notice Only callable by the owner
     */
    function setMaxPlayersPerMap(uint256 newMaxPlayers) external onlyOwner {
        maxPlayersPerMap = newMaxPlayers;
    }

    /**
     * @dev Withdraw contract balance
     * @notice Only callable by the owner
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
} 