import { useState, FormEvent } from 'react';
import { Modal } from './Modal';
import { groupAPI, userAPI } from '../lib/api';
import { User } from '../types';
import { useToast } from './Toast';
import { Search, X } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateGroupModal = ({ isOpen, onClose, onSuccess }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { showToast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await userAPI.search(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      showToast('Failed to search users', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const addMember = (user: User) => {
    if (!selectedMembers.find((m) => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMember = (userId: string | number) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== userId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showToast('Please enter a group name', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await groupAPI.create(
        groupName,
        selectedMembers.map((m) => m.id),
        budgetLimit ? parseFloat(budgetLimit) : undefined
      );
      showToast('Group created successfully!', 'success');
      setGroupName('');
      setBudgetLimit('');
      setSelectedMembers([]);
      onSuccess();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create group', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Weekend Trip"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weekly Budget Limit (Optional, in ₹)
          </label>
          <input
            type="number"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., 5000"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add Members
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Search users by email or name"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="mt-2 w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>

          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addMember(user)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMembers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected Members ({selectedMembers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{member.name}</span>
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </Modal>
  );
};
